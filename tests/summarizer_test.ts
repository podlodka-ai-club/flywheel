/**
 * Tests for the end-of-ticket summarizer (src/memory/summarizer.ts):
 * candidate selection (terminal, idle, verified-customer threads only),
 * exactly-one-episode idempotency across sweeps, episode decay, and the
 * self-learning loop distilling human-resolution notes into persistent
 * playbooks.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "node:path";
import { openDb } from "../src/db/client.ts";
import { insertCustomerMessage, insertSystemMessage } from "../src/db/messages.ts";
import { claimNextMessage, completeWithReply } from "../src/db/queue.ts";
import { listActiveMemories } from "../src/memory/store.ts";
import {
  createEchoThreadSummarizer,
  findSummarizableThreads,
  summarizeOnce,
} from "../src/memory/summarizer.ts";

async function withTempDb(fn: (db: ReturnType<typeof openDb>) => Promise<void> | void) {
  const dir = await Deno.makeTempDir({ prefix: "flywheel_summarizer_test_" });
  const db = openDb(join(dir, "test.db"));
  try {
    await fn(db);
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
}

function resolveThread(db: ReturnType<typeof openDb>, threadId: string, id: string, at: number) {
  insertCustomerMessage(db, {
    id,
    threadId,
    content: "webhooks keep timing out",
    customerId: "google",
    createdAt: at,
  });
  const claimed = claimNextMessage(db, "w1", at + 1);
  assert(claimed !== null && claimed.id === id);
  completeWithReply(db, {
    anchorId: id,
    threadId,
    workerId: "w1",
    reply: {
      id: `r_${id}`,
      content: "Try raising the batch size to 100.",
      model: "echo",
      tokensIn: null,
      tokensOut: null,
      costUsd: null,
    },
    now: at + 2,
  });
}

Deno.test("summarizer: terminal idle threads get exactly one episode; active/fresh threads skipped", async () => {
  await withTempDb(async (db) => {
    resolveThread(db, "tkt_done", "m1", 1000);
    // Fresh thread: too recent.
    resolveThread(db, "tkt_fresh", "m2", 90_000);
    // Active thread: still pending.
    insertCustomerMessage(db, { id: "m3", threadId: "tkt_open", content: "hi", customerId: "google", createdAt: 1000 });
    // Anonymous thread: no customer, never summarized.
    db.prepare("UPDATE messages SET customer_id = NULL WHERE thread_id = 'tkt_open'").run();

    const args = { now: 100_000, summarizeAfterMs: 50_000, activeCap: 100 };
    assertEquals(
      findSummarizableThreads(db, args).map((c) => c.threadId),
      ["tkt_done"],
    );

    const first = await summarizeOnce(db, createEchoThreadSummarizer(), args);
    assertEquals(first.summarized.length, 1);
    assertEquals(first.summarized[0].threadId, "tkt_done");
    assertEquals(first.summarized[0].playbookId, null);

    // Idempotent: second sweep does nothing.
    const second = await summarizeOnce(db, createEchoThreadSummarizer(), args);
    assertEquals(second.summarized.length, 0);

    const memories = listActiveMemories(db, "google", 100_001);
    const episodes = memories.filter((m) => m.kind === "episode");
    assertEquals(episodes.length, 1);
    assertEquals(episodes[0].provenance, "ticket_summary");
    assertEquals(episodes[0].sourceThreadId, "tkt_done");
    assertStringIncludes(episodes[0].content, "webhooks keep timing out");
    assert(episodes[0].expiresAt !== null, "episodes must decay");
  });
});

Deno.test("summarizer: human resolution notes distill into a playbook (self-learning loop)", async () => {
  await withTempDb(async (db) => {
    resolveThread(db, "tkt_hr", "m1", 1000);
    insertSystemMessage(db, {
      threadId: "tkt_hr",
      content: "Raised webhook batch size to 100 and enabled retry backoff in Admin → Integrations.",
      customerId: "google",
      metadata: { type: "human_resolution" },
      createdAt: 2000,
    });

    const result = await summarizeOnce(db, createEchoThreadSummarizer(), {
      now: 100_000,
      summarizeAfterMs: 50_000,
      activeCap: 100,
    });
    assertEquals(result.summarized.length, 1);
    assert(result.summarized[0].playbookId !== null, "expected a playbook");

    const playbooks = listActiveMemories(db, "google", 100_001).filter((m) => m.kind === "playbook");
    assertEquals(playbooks.length, 1);
    assertEquals(playbooks[0].provenance, "human_resolution");
    assertStringIncludes(playbooks[0].content, "batch size");
    assertEquals(playbooks[0].expiresAt, null, "playbooks persist");
  });
});
