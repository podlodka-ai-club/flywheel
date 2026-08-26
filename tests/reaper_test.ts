import { assert, assertEquals } from "@std/assert";
import { join } from "node:path";
import type { AgentHarness } from "../src/agent/harness.ts";
import { openDb } from "../src/db/client.ts";
import { getMessage, getThreadMessages, insertCustomerMessage } from "../src/db/messages.ts";
import { claimNextMessage, reapExpiredLeases } from "../src/db/queue.ts";
import { startReaper } from "../src/engine/reaper.ts";
import { startWorkers } from "../src/engine/worker.ts";

async function withTempDb(fn: (db: ReturnType<typeof openDb>) => void | Promise<void>) {
  const dir = await Deno.makeTempDir({ prefix: "flywheel_reaper_test_" });
  const db = openDb(join(dir, "test.db"));
  try {
    await fn(db);
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 5000, stepMs = 20): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  throw new Error("waitFor timed out");
}

Deno.test("reapExpiredLeases: stale leases with retries left go back to pending", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, { id: "stale", threadId: "t1", content: "a", createdAt: 1000 });
    insertCustomerMessage(db, { id: "fresh", threadId: "t2", content: "b", createdAt: 2000 });
    claimNextMessage(db, "w1", 10_000); // claims "stale" (oldest created_at)
    claimNextMessage(db, "w2", 99_000); // claims "fresh" with a recent lease

    const { reclaimed, failed } = reapExpiredLeases(db, {
      now: 100_000,
      lockTimeoutMs: 50_000,
      maxRetries: 3,
    });
    assertEquals(reclaimed.map((m) => m.id), ["stale"]);
    assertEquals(failed.length, 0);

    const staleRow = getMessage(db, "stale");
    assertEquals(staleRow?.status, "pending");
    assertEquals(staleRow?.workerId, null);
    assertEquals(staleRow?.lockedAt, null);
    assertEquals(staleRow?.attemptCount, 1); // attempts are NOT reset

    assertEquals(getMessage(db, "fresh")?.status, "processing");
  });
});

Deno.test("reapExpiredLeases: stale leases past maxRetries become terminal failed", async () => {
  await withTempDb((db) => {
    insertCustomerMessage(db, { id: "m1", threadId: "t1", content: "a", createdAt: 1000 });
    claimNextMessage(db, "w1", 10_000);
    db.prepare("UPDATE messages SET attempt_count = 3 WHERE id = 'm1'").run();

    const { reclaimed, failed } = reapExpiredLeases(db, {
      now: 100_000,
      lockTimeoutMs: 50_000,
      maxRetries: 3,
    });
    assertEquals(reclaimed.length, 0);
    assertEquals(failed.map((m) => m.id), ["m1"]);

    const row = getMessage(db, "m1");
    assertEquals(row?.status, "failed");
    assertEquals(row?.error, "lease expired; retry limit reached");
    assertEquals(row?.workerId, null);
  });
});

Deno.test("reaped-while-alive race: exactly one reply survives (fence + reaper live)", async () => {
  await withTempDb(async (db) => {
    insertCustomerMessage(db, { id: "m1", threadId: "t1", content: "slow one", createdAt: 1000 });

    // First run is slow enough to outlive its lease; the reprocessing run is
    // instant, so it commits long before its own lease could expire.
    let runCalls = 0;
    const slowFirstEcho: AgentHarness = {
      mode: "slow-first-echo",
      run: async (input) => {
        if (++runCalls === 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        return {
          content: `ECHO: ${input.message.content}`,
          model: "echo",
          tokensIn: null,
          tokensOut: null,
          costUsd: null,
        };
      },
    };

    // Lease expires after 100ms; the first run takes 300ms — that worker WILL
    // be reaped while still alive, a second worker reprocesses instantly and
    // commits, and the original worker's late commit MUST hit the fence.
    const pool = startWorkers(db, slowFirstEcho, {
      workerConcurrency: 2,
      pollIntervalMs: 15,
      maxRetries: 5,
    });
    const reaper = startReaper(db, { lockTimeoutMs: 100, maxRetries: 5, intervalMs: 40 });
    try {
      await waitFor(() => getMessage(db, "m1")?.status === "completed");
      // Let the slower loser wake up and try (and fail) to commit too.
      await new Promise((resolve) => setTimeout(resolve, 400));
    } finally {
      await Promise.all([pool.stop(), reaper.stop()]);
    }

    const replies = getThreadMessages(db, "t1").filter((m) => m.role === "assistant");
    assertEquals(replies.length, 1, "duplicate reply reached the table");
    assertEquals(replies[0].inReplyTo, "m1");
    assertEquals(getMessage(db, "m1")?.status, "completed");
    assert((getMessage(db, "m1")?.attemptCount ?? 0) >= 2, "expected a reprocessing attempt");
  });
});
