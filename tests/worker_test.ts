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

    // t2: a plain single-message reply.
    const t2Replies = getThreadMessages(db, "t2").filter((m) => m.role === "assistant");
    assertEquals(t2Replies.length, 1);
    assertEquals(t2Replies[0].inReplyTo, "m3");
    assertEquals(t2Replies[0].content, "ECHO: other");
    assertEquals(t2Replies[0].model, "echo");
    assertEquals(t2Replies[0].sentToCustomerAt, null);

    // t1: m2 was pending behind the anchor, so the pre-commit freshness check
    // (spec §4.3) coalesces it — ONE consolidated reply anchored on m1. If
    // m1 completed before m2 was even inserted... impossible here: both were
    // inserted before the pool started. Either way, no per-message pair split
    // may produce two replies out of order — coalescing is the contract.
    const t1Replies = getThreadMessages(db, "t1").filter((m) => m.role === "assistant");
    assertEquals(t1Replies.length, 1, "expected one consolidated reply for t1");
    assertEquals(t1Replies[0].inReplyTo, "m1");
    assertEquals(t1Replies[0].content, "ECHO: hello | again");
  });
});

Deno.test("follow-ups arriving mid-run coalesce into one consolidated reply", async () => {
  await withTempDb(async (db) => {
    insertCustomerMessage(db, { id: "m1", threadId: "t1", content: "one", createdAt: 1000 });

    // First run blocks until the test releases it — giving us a deterministic
    // window to insert follow-ups "while the reply is being generated".
    let releaseFirstRun = () => {};
    const firstRunGate = new Promise<void>((resolve) => {
      releaseFirstRun = resolve;
    });
    let runCalls = 0;
    const gatedEcho: AgentHarness = {
      mode: "gated-echo",
      run: async (input) => {
        runCalls++;
        if (runCalls === 1) await firstRunGate;
        const texts = [input.message.content, ...(input.followUps ?? []).map((m) => m.content)];
        return {
          content: `ECHO: ${texts.join(" | ")}`,
          model: "echo",
          tokensIn: null,
          tokensOut: null,
          costUsd: null,
        };
      },
    };

    const pool = startWorkers(db, gatedEcho, {
      workerConcurrency: 1,
      pollIntervalMs: 10,
      maxRetries: 3,
    });
    try {
      await waitFor(() => getMessage(db, "m1")?.status === "processing");
      insertCustomerMessage(db, { id: "m2", threadId: "t1", content: "two", createdAt: 2000 });
      insertCustomerMessage(db, { id: "m3", threadId: "t1", content: "three", createdAt: 3000 });
      releaseFirstRun();
      await waitFor(() =>
        ["m1", "m2", "m3"].every((id) => getMessage(db, id)?.status === "completed")
      );
    } finally {
      await pool.stop();
    }

    const replies = getThreadMessages(db, "t1").filter((m) => m.role === "assistant");
    assertEquals(replies.length, 1, "expected ONE consolidated reply");
    assertEquals(replies[0].content, "ECHO: one | two | three");
    assertEquals(replies[0].inReplyTo, "m1");
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
