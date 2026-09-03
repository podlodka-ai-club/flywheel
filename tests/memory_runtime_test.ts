/**
 * Tests for the memory runtime (src/memory/runtime.ts) — the engine-side
 * driver of a strategy's asynchronous ports. The bus tail: typed events in
 * bus order to a subscribed handler, rows without a verified customer
 * dropped, unsubscribed types skipped, the thread snapshot as of the event;
 * cursor persistence (a new strategy starts at the end of the bus, a
 * restarted one resumes where it stopped, nothing is delivered twice);
 * retry-then-drop on a failing handler; declared jobs looping on their
 * interval and surviving errors; close() on stop; and the whole path — the
 * worker's fenced commit reaching a trigger-only strategy — end to end in
 * echo mode, plus the structured strategy summarizing on ticket_closed
 * through the runtime.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "node:path";
import { createHarness } from "../src/agent/harness.ts";
import { openDb } from "../src/db/client.ts";
import {
  insertCustomerMessage,
  insertSystemMessage,
  latestMessageSequence,
} from "../src/db/messages.ts";
import { claimNextMessage, completeWithReply } from "../src/db/queue.ts";
import { startWorkers } from "../src/engine/worker.ts";
import { classifyMessage, startMemoryRuntime } from "../src/memory/runtime.ts";
import type { MemoryEvent, MemoryStrategy } from "../src/memory/strategy.ts";
import { createStructuredMemoryStrategy } from "../src/memory/strategies/structured/index.ts";

async function withTempDb(fn: (db: ReturnType<typeof openDb>) => Promise<void>) {
  const dir = await Deno.makeTempDir({ prefix: "flywheel_memruntime_test_" });
  const db = openDb(join(dir, "test.db"));
  try {
    await fn(db);
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 5000, stepMs = 10): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  throw new Error("waitFor timed out");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A strategy with no-op run/audit ports; the test supplies the async ports. */
function fakeStrategy(ports: Partial<MemoryStrategy> & { name: string }): MemoryStrategy {
  return {
    openRun: (input) => ({
      customerId: input.customerId,
      hydrate: () => Promise.resolve({ section: null, stats: {} }),
      tools: () => [],
      toolGuidance: () => "",
    }),
    audit: { listCustomers: () => [], listEntries: () => [], archive: () => false, erase: () => 0 },
    describe: () => ({}),
    ...ports,
  };
}

/** Customer message → claimed → replied (reply id `r_<id>`), like a worker would. */
function resolveThread(db: ReturnType<typeof openDb>, threadId: string, id: string, at: number) {
  insertCustomerMessage(db, { id, threadId, content: "webhooks keep timing out", customerId: "google", createdAt: at });
  const claimed = claimNextMessage(db, "w1", at + 1);
  assert(claimed !== null && claimed.id === id, `expected to claim ${id}`);
  completeWithReply(db, {
    anchorId: id,
    threadId,
    workerId: "w1",
    reply: { id: `r_${id}`, content: "Try raising the batch size to 100.", model: "echo", tokensIn: null, tokensOut: null, costUsd: null },
    now: at + 2,
  });
}

const FAST = { eventPollMs: 10 };

Deno.test("bus tail: typed events in bus order; unverified rows dropped; unsubscribed types skipped; thread snapshot as of the event", async () => {
  await withTempDb(async (db) => {
    // Already on the bus before the strategy's first start: never delivered.
    insertSystemMessage(db, { threadId: "t_old", content: "old note", customerId: "google", createdAt: 1 });

    const seen: MemoryEvent[] = [];
    const strategy = fakeStrategy({
      name: "tail",
      events: {
        types: ["customer_message", "agent_reply", "human_resolution", "ticket_closed"],
        handle: (event) => {
          seen.push(event);
          return Promise.resolve();
        },
      },
    });
    const runtime = startMemoryRuntime(db, strategy, FAST);
    let resolutionId = "";
    let closedId = "";
    try {
      resolveThread(db, "t1", "m1", 1000); // m1 + r1
      resolutionId = insertSystemMessage(db, { threadId: "t1", content: "fixed by hand", customerId: "google", metadata: { type: "human_resolution" }, createdAt: 1003 }).id;
      closedId = insertSystemMessage(db, { threadId: "t1", content: "closed", customerId: "google", metadata: { type: "ticket_closed" }, createdAt: 1004 }).id;
      insertSystemMessage(db, { threadId: "t1", content: "operational marker", customerId: "google", createdAt: 1005 }); // system_note: not subscribed
      insertCustomerMessage(db, { id: "anon", threadId: "t_anon", content: "who am i", createdAt: 1006 }); // no verified customer: dropped
      insertCustomerMessage(db, { id: "m2", threadId: "t2", content: "hello", customerId: "facebook", createdAt: 1007 });
      await waitFor(() => seen.length === 5);
      await sleep(30); // nothing else trickles in
    } finally {
      await runtime.stop();
    }

    assertEquals(seen.map((e) => e.type), ["customer_message", "agent_reply", "human_resolution", "ticket_closed", "customer_message"]);
    assertEquals(seen.map((e) => e.message.id), ["m1", "r_m1", resolutionId, closedId, "m2"]);
    assertEquals(seen.map((e) => e.customerId), ["google", "google", "google", "google", "facebook"]);
    for (let i = 1; i < seen.length; i++) {
      assert(seen[i].sequence > seen[i - 1].sequence, "events must carry increasing bus positions");
    }
    // The thread as of the ticket_closed event: everything up to it, not the later marker.
    assertEquals(seen[3].thread().map((m) => m.id), ["m1", "r_m1", resolutionId, closedId]);
    assertEquals(seen[3].threadId, "t1");
  });
});

Deno.test("classifyMessage maps rows to the event table", () => {
  const base = { threadId: "t", customerId: "c", content: "", status: "completed" as const, inReplyTo: null, workerId: null, lockedAt: null, attemptCount: 0, error: null, model: null, tokensIn: null, tokensOut: null, costUsd: null, sentToCustomerAt: null, createdAt: 1, completedAt: 1 };
  assertEquals(classifyMessage({ ...base, id: "1", role: "customer", metadata: null }), "customer_message");
  assertEquals(classifyMessage({ ...base, id: "2", role: "assistant", metadata: { escalated: true } }), "agent_reply");
  assertEquals(classifyMessage({ ...base, id: "3", role: "system", metadata: { type: "human_resolution" } }), "human_resolution");
  assertEquals(classifyMessage({ ...base, id: "4", role: "system", metadata: { type: "ticket_closed" } }), "ticket_closed");
  assertEquals(classifyMessage({ ...base, id: "5", role: "system", metadata: { type: "something_else" } }), "system_note");
  assertEquals(classifyMessage({ ...base, id: "6", role: "system", metadata: null }), "system_note");
});

Deno.test("cursor: a new strategy starts at the end of the bus; a restart resumes where it stopped; nothing is delivered twice", async () => {
  await withTempDb(async (db) => {
    insertCustomerMessage(db, { id: "pre", threadId: "t0", content: "before any start", customerId: "google", createdAt: 1 });
    const seen: string[] = [];
    const strategy = fakeStrategy({
      name: "cursor",
      events: {
        types: ["customer_message"],
        handle: (event) => {
          seen.push(event.message.id);
          return Promise.resolve();
        },
      },
    });

    let runtime = startMemoryRuntime(db, strategy, FAST);
    insertCustomerMessage(db, { id: "a", threadId: "t1", content: "a", customerId: "google", createdAt: 1000 });
    await waitFor(() => seen.length === 1);
    await runtime.stop();
    const cursor = db.prepare("SELECT last_sequence FROM memory_cursors WHERE strategy = 'cursor'").get() as { last_sequence: number };
    assertEquals(Number(cursor.last_sequence), latestMessageSequence(db));

    // Rows landing while the engine is down are delivered after the restart.
    insertCustomerMessage(db, { id: "b", threadId: "t1", content: "b", customerId: "google", createdAt: 1001 });
    insertCustomerMessage(db, { id: "c", threadId: "t2", content: "c", customerId: "facebook", createdAt: 1002 });
    runtime = startMemoryRuntime(db, strategy, FAST);
    await waitFor(() => seen.length === 3);
    await sleep(30);
    await runtime.stop();
    assertEquals(seen, ["a", "b", "c"]);

    // Another strategy name has its own cursor and starts at "now".
    const other: string[] = [];
    runtime = startMemoryRuntime(
      db,
      fakeStrategy({
        name: "other",
        events: {
          types: ["customer_message"],
          handle: (event) => {
            other.push(event.message.id);
            return Promise.resolve();
          },
        },
      }),
      FAST,
    );
    insertCustomerMessage(db, { id: "d", threadId: "t3", content: "d", customerId: "google", createdAt: 1003 });
    await waitFor(() => other.length === 1);
    await runtime.stop();
    assertEquals(other, ["d"]);
  });
});

Deno.test("a failing handler is retried, then the event is dropped and the tail moves on", async () => {
  await withTempDb(async (db) => {
    const calls: string[] = [];
    const strategy = fakeStrategy({
      name: "flaky",
      events: {
        types: ["customer_message"],
        handle: (event) => {
          calls.push(event.message.id);
          if (event.message.id === "poison") return Promise.reject(new Error("boom"));
          if (event.message.id === "flaky" && calls.filter((c) => c === "flaky").length < 2) {
            return Promise.reject(new Error("transient"));
          }
          return Promise.resolve();
        },
      },
    });
    const runtime = startMemoryRuntime(db, strategy, { eventPollMs: 10, eventMaxAttempts: 3 });
    try {
      for (const id of ["poison", "flaky", "fine"]) {
        insertCustomerMessage(db, { id, threadId: "t1", content: id, customerId: "google", createdAt: 1000 });
      }
      await waitFor(() => calls.includes("fine"));
    } finally {
      await runtime.stop();
    }
    // poison: 3 attempts then dropped; flaky: fails once, succeeds; fine: once.
    assertEquals(calls, ["poison", "poison", "poison", "flaky", "flaky", "fine"]);
    const cursor = db.prepare("SELECT last_sequence FROM memory_cursors WHERE strategy = 'flaky'").get() as { last_sequence: number };
    assertEquals(Number(cursor.last_sequence), latestMessageSequence(db));
  });
});

Deno.test("declared jobs loop on their interval, survive errors, and stop; close() runs on stop", async () => {
  await withTempDb(async (db) => {
    let ticks = 0;
    let closed = false;
    const strategy = fakeStrategy({
      name: "jobs",
      jobs: [{
        name: "tick",
        intervalMs: 5,
        run: () => {
          ticks++;
          return ticks === 2 ? Promise.reject(new Error("hiccup")) : Promise.resolve();
        },
      }],
      close: () => {
        closed = true;
        return Promise.resolve();
      },
    });
    const runtime = startMemoryRuntime(db, strategy, FAST);
    await waitFor(() => ticks >= 4);
    await runtime.stop();
    const atStop = ticks;
    await sleep(30);
    assertEquals(ticks, atStop, "job must not run after stop()");
    assert(closed, "close() must run on stop()");
  });
});

Deno.test("end to end in echo mode: the worker's committed reply reaches a trigger-only strategy", async () => {
  await withTempDb(async (db) => {
    const replies: string[] = [];
    const strategy = fakeStrategy({
      name: "notes",
      events: {
        types: ["agent_reply"],
        handle: (event) => {
          replies.push(`${event.threadId}:${event.message.content}:${event.thread().length}`);
          return Promise.resolve();
        },
      },
    });
    const pool = startWorkers(db, createHarness("echo"), {
      workerConcurrency: 1,
      pollIntervalMs: 10,
      maxRetries: 1,
      memory: strategy,
    });
    const runtime = startMemoryRuntime(db, strategy, FAST);
    try {
      insertCustomerMessage(db, { id: "m1", threadId: "t1", content: "hi", customerId: "google", createdAt: 1000 });
      await waitFor(() => replies.length === 1);
    } finally {
      await runtime.stop();
      await pool.stop();
    }
    // The reply row is the event; the thread as of it holds the anchor + the reply.
    assertEquals(replies, ["t1:ECHO: hi:2"]);
  });
});

Deno.test("structured strategy through the runtime: a platform ticket_closed note yields the episode without the idle wait", async () => {
  await withTempDb(async (db) => {
    const strategy = createStructuredMemoryStrategy({
      db,
      config: {
        llmProvider: "openrouter",
        summarizerProvider: "",
        summarizerModel: "",
        summarizeAfterMs: 86_400_000, // the sweep alone would wait a day
        memoryHydrationBudget: 800,
        memoryRunWriteCap: 3,
        memoryActiveCap: 100,
      },
    });
    const runtime = startMemoryRuntime(db, strategy, FAST);
    try {
      resolveThread(db, "tkt_1", "m1", Date.now());
      insertSystemMessage(db, { threadId: "tkt_1", content: "closed", customerId: "google", metadata: { type: "ticket_closed" } });
      await waitFor(() => strategy.audit.listEntries("google").some((e) => e.kind === "episode"));
    } finally {
      await runtime.stop();
    }
    const episode = strategy.audit.listEntries("google").find((e) => e.kind === "episode");
    assert(episode !== undefined);
    assertEquals(episode.sourceThreadId, "tkt_1");
    assertStringIncludes(episode.content, "webhooks keep timing out");
  });
});
