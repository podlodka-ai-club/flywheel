import { assert, assertEquals } from "@std/assert";
import { join } from "node:path";
import { openDb } from "../src/db/client.ts";
import { getMessage, getThreadMessages, insertCustomerMessage } from "../src/db/messages.ts";
import {
  claimNextMessage,
  completeWithReply,
  markFailed,
  releaseClaim,
  type ReplyInsert,
} from "../src/db/queue.ts";

async function withTempDb(fn: (db: ReturnType<typeof openDb>) => void) {
  const dir = await Deno.makeTempDir({ prefix: "flywheel_queue_test_" });
  const db = openDb(join(dir, "test.db"));
  try {
    fn(db);
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
}

function reply(id: string, content = "reply"): ReplyInsert {
  return { id, content, model: "echo", tokensIn: null, tokensOut: null, costUsd: null };
}

Deno.test("claim takes the oldest pending message and leases it", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, { id: "m2", threadId: "t1", content: "second", createdAt: 2000 });
    insertCustomerMessage(db, { id: "m1", threadId: "t2", content: "first", createdAt: 1000 });

    const claimed = claimNextMessage(db, "w1", 5000);
    assert(claimed !== null);
    assertEquals(claimed.id, "m1");
    assertEquals(claimed.status, "processing");
    assertEquals(claimed.workerId, "w1");
    assertEquals(claimed.lockedAt, 5000);
    assertEquals(claimed.attemptCount, 1);
  });
});

Deno.test("per-thread serialization: no claim while the thread has a message in flight", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, { id: "m1", threadId: "t1", content: "one", createdAt: 1000 });
    insertCustomerMessage(db, { id: "m2", threadId: "t1", content: "two", createdAt: 2000 });
    insertCustomerMessage(db, { id: "m3", threadId: "t2", content: "other thread", createdAt: 3000 });

    const first = claimNextMessage(db, "w1", 5000);
    assertEquals(first?.id, "m1");

    // m2 is older than m3 but its thread is busy — the claim must skip to t2.
    const second = claimNextMessage(db, "w2", 5001);
    assertEquals(second?.id, "m3");

    // Nothing claimable left: t1 blocked, t2 in flight.
    assertEquals(claimNextMessage(db, "w3", 5002), null);

    // Completing m1 unblocks t1.
    assertEquals(
      completeWithReply(db, { anchorId: "m1", threadId: "t1", workerId: "w1", reply: reply("r1") }),
      "committed",
    );
    assertEquals(claimNextMessage(db, "w3", 5003)?.id, "m2");
  });
});

Deno.test("interleaved claims never hand out the same message twice", async () => {
  await withTempDb((db) => {
    for (let i = 0; i < 20; i++) {
      insertCustomerMessage(db, {
        id: `m${i}`,
        threadId: `t${i % 10}`,
        content: `msg ${i}`,
        createdAt: 1000 + i,
      });
    }
    const seen = new Set<string>();
    const workers = ["w1", "w2", "w3"];
    let exhaustedRounds = 0;
    while (exhaustedRounds < 3) {
      let progress = false;
      for (const w of workers) {
        const claimed = claimNextMessage(db, w, Date.now());
        if (claimed) {
          assert(!seen.has(claimed.id), `double claim of ${claimed.id}`);
          seen.add(claimed.id);
          completeWithReply(db, {
            anchorId: claimed.id,
            threadId: claimed.threadId,
            workerId: w,
            reply: reply(`r_${claimed.id}`),
          });
          progress = true;
        }
      }
      exhaustedRounds = progress ? 0 : exhaustedRounds + 1;
    }
    assertEquals(seen.size, 20);
  });
});

Deno.test("completeWithReply commits customer row + assistant reply atomically", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, { id: "m1", threadId: "t1", content: "hello", createdAt: 1000 });
    const claimed = claimNextMessage(db, "w1", 2000);
    assert(claimed !== null);

    const outcome = completeWithReply(db, {
      anchorId: "m1",
      threadId: "t1",
      workerId: "w1",
      reply: { ...reply("r1", "ECHO: hello"), tokensIn: 12, tokensOut: 5, costUsd: 0.001 },
      now: 3000,
    });
    assertEquals(outcome, "committed");

    const customer = getMessage(db, "m1");
    assertEquals(customer?.status, "completed");
    assertEquals(customer?.completedAt, 3000);

    const replyRow = getMessage(db, "r1");
    assertEquals(replyRow?.role, "assistant");
    assertEquals(replyRow?.status, "completed");
    assertEquals(replyRow?.inReplyTo, "m1");
    assertEquals(replyRow?.content, "ECHO: hello");
    assertEquals(replyRow?.tokensIn, 12);
    assertEquals(replyRow?.sentToCustomerAt, null);
  });
});

Deno.test("fence: a reaped-and-reassigned claim cannot commit a duplicate reply", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, { id: "m1", threadId: "t1", content: "hello", createdAt: 1000 });
    const w1Claim = claimNextMessage(db, "w1", 2000);
    assert(w1Claim !== null);

    // Simulate the reaper: lease expired, message returned to pending...
    releaseClaimAsReaper(db, "m1");
    // ...and a second worker reclaims and completes it.
    const w2Claim = claimNextMessage(db, "w2", 3000);
    assertEquals(w2Claim?.id, "m1");
    assertEquals(
      completeWithReply(db, { anchorId: "m1", threadId: "t1", workerId: "w2", reply: reply("r2") }),
      "committed",
    );

    // The original worker wakes up and tries to commit — fence must reject.
    assertEquals(
      completeWithReply(db, { anchorId: "m1", threadId: "t1", workerId: "w1", reply: reply("r1") }),
      "lost_lease",
    );

    const rows = getThreadMessages(db, "t1");
    assertEquals(rows.filter((m) => m.role === "assistant").length, 1);
    assertEquals(rows.find((m) => m.role === "assistant")?.id, "r2");
  });

  function releaseClaimAsReaper(db: ReturnType<typeof openDb>, id: string) {
    db.prepare(
      "UPDATE messages SET status = 'pending', worker_id = NULL, locked_at = NULL WHERE id = ?",
    ).run(id);
  }
});

Deno.test("UNIQUE(in_reply_to) backstop rejects a second reply to the same anchor", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, { id: "m1", threadId: "t1", content: "hello", createdAt: 1000 });
    const claimed = claimNextMessage(db, "w1", 2000);
    assert(claimed !== null);
    assertEquals(
      completeWithReply(db, { anchorId: "m1", threadId: "t1", workerId: "w1", reply: reply("r1") }),
      "committed",
    );

    // Force the anchor back to a processing state owned by w1 so the fence
    // passes and ONLY the unique index stands between us and a duplicate.
    db.prepare("UPDATE messages SET status = 'processing', worker_id = 'w1' WHERE id = 'm1'").run();
    assertEquals(
      completeWithReply(db, { anchorId: "m1", threadId: "t1", workerId: "w1", reply: reply("r_dup") }),
      "lost_lease",
    );
    assertEquals(getMessage(db, "r_dup"), null);
    // The rollback restored nothing else: still exactly one reply.
    assertEquals(
      getThreadMessages(db, "t1").filter((m) => m.role === "assistant").length,
      1,
    );
  });
});

Deno.test("releaseClaim and markFailed are fenced on ownership", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, { id: "m1", threadId: "t1", content: "hello", createdAt: 1000 });
    claimNextMessage(db, "w1", 2000);

    // Wrong worker: no effect.
    assertEquals(releaseClaim(db, "m1", "w2"), false);
    assertEquals(markFailed(db, "m1", "w2", "nope"), false);
    assertEquals(getMessage(db, "m1")?.status, "processing");

    // Owner releases: message is pending and claimable again.
    assertEquals(releaseClaim(db, "m1", "w1"), true);
    const record = getMessage(db, "m1");
    assertEquals(record?.status, "pending");
    assertEquals(record?.workerId, null);
    assertEquals(record?.lockedAt, null);

    // Reclaim and fail terminally.
    claimNextMessage(db, "w1", 3000);
    assertEquals(markFailed(db, "m1", "w1", "agent exploded"), true);
    const failed = getMessage(db, "m1");
    assertEquals(failed?.status, "failed");
    assertEquals(failed?.error, "agent exploded");
    assertEquals(failed?.workerId, null);
  });
});
