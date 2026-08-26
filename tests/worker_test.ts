import { assert, assertEquals } from "@std/assert";
import { join } from "node:path";
import { createHarness } from "../src/agent/harness.ts";
import type { AgentHarness } from "../src/agent/harness.ts";
import { openDb } from "../src/db/client.ts";
import { getMessage, getThreadMessages, insertCustomerMessage } from "../src/db/messages.ts";
import { startWorkers } from "../src/engine/worker.ts";

async function waitFor(predicate: () => boolean, timeoutMs = 5000, stepMs = 20): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  throw new Error("waitFor timed out");
}

async function withTempDb(fn: (db: ReturnType<typeof openDb>) => Promise<void>) {
  const dir = await Deno.makeTempDir({ prefix: "flywheel_worker_test_" });
  const db = openDb(join(dir, "test.db"));
  try {
    await fn(db);
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("echo pipeline: claim → process → fenced completion, end to end", async () => {
  await withTempDb(async (db) => {
    insertCustomerMessage(db, { id: "m1", threadId: "t1", content: "hello", createdAt: 1000 });
    insertCustomerMessage(db, { id: "m2", threadId: "t1", content: "again", createdAt: 2000 });
    insertCustomerMessage(db, { id: "m3", threadId: "t2", content: "other", createdAt: 1500 });

    const pool = startWorkers(db, createHarness("echo"), {
      workerConcurrency: 2,
      pollIntervalMs: 15,
      maxRetries: 3,
    });
    try {
      await waitFor(() =>
        ["m1", "m2", "m3"].every((id) => getMessage(db, id)?.status === "completed")
      );
    } finally {
      await pool.stop();
    }

    for (const [anchorId, threadId, content] of [
      ["m1", "t1", "hello"],
      ["m2", "t1", "again"],
      ["m3", "t2", "other"],
    ] as const) {
      const replyRow = getThreadMessages(db, threadId).find(
        (m) => m.role === "assistant" && m.inReplyTo === anchorId,
      );
      assert(replyRow !== undefined, `missing reply for ${anchorId}`);
      assertEquals(replyRow.content, `ECHO: ${content}`);
      assertEquals(replyRow.status, "completed");
      assertEquals(replyRow.model, "echo");
      assertEquals(replyRow.sentToCustomerAt, null);
    }

    // Per-thread FIFO: m1's reply committed no later than m2's.
    const t1 = getThreadMessages(db, "t1");
    const r1 = t1.find((m) => m.inReplyTo === "m1");
    const r2 = t1.find((m) => m.inReplyTo === "m2");
    assert(r1 !== undefined && r2 !== undefined);
    assert(
      (r1.completedAt ?? 0) <= (r2.completedAt ?? Infinity),
      "thread t1 replies out of order",
    );
  });
});

Deno.test("failing agent: retries then terminal 'failed' after maxRetries attempts", async () => {
  await withTempDb(async (db) => {
    insertCustomerMessage(db, { id: "m1", threadId: "t1", content: "doomed", createdAt: 1000 });

    const boom: AgentHarness = {
      mode: "boom",
      run: () => Promise.reject(new Error("synthetic agent failure")),
    };
    const pool = startWorkers(db, boom, {
      workerConcurrency: 1,
      pollIntervalMs: 10,
      maxRetries: 3,
    });
    try {
      await waitFor(() => getMessage(db, "m1")?.status === "failed");
    } finally {
      await pool.stop();
    }

    const failed = getMessage(db, "m1");
    assertEquals(failed?.attemptCount, 3);
    assertEquals(failed?.error, "synthetic agent failure");
    assertEquals(failed?.workerId, null);
    // No reply row was ever committed.
    assertEquals(
      getThreadMessages(db, "t1").filter((m) => m.role === "assistant").length,
      0,
    );
  });
});
