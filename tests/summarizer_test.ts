/**
 * Tests for the end-of-ticket summarizer (src/memory/strategies/structured/summarizer.ts):
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
import { listActiveMemories } from "../src/memory/strategies/structured/store.ts";
import {
  createEchoThreadSummarizer,
  findSummarizableThreads,
  playbookProvenanceFor,
  summarizeOnce,
} from "../src/memory/strategies/structured/summarizer.ts";

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
    assertEquals(result.summarized[0].playbookProvenance, "human_resolution");
    assertStringIncludes(playbooks[0].content, "batch size");
    assertEquals(playbooks[0].expiresAt, null, "playbooks persist");
  });
});

function teamNote(
  db: ReturnType<typeof openDb>,
  threadId: string,
  author: { id: string; name: string },
  content: string,
  createdAt: number,
) {
  return insertSystemMessage(db, {
    threadId,
    content,
    customerId: "google",
    metadata: { type: "internal_note", channel: "dev-ui", author },
    createdAt,
  });
}

const ANA = { id: "ana", name: "Ana Petrova" };
const BEN = { id: "ben", name: "Ben Okoro" };

Deno.test("summarizer: an internal team discussion distills into a team_discussion playbook from its conclusion", async () => {
  await withTempDb(async (db) => {
    resolveThread(db, "tkt_team", "m1", 1000);
    teamNote(db, "tkt_team", ANA, "Probably the firewall dropping keepalives?", 2000);
    teamNote(db, "tkt_team", BEN, "No — it's the webhook batch size. Raise it to 100 in Admin → Integrations.", 3000);

    const result = await summarizeOnce(db, createEchoThreadSummarizer(), {
      now: 100_000,
      summarizeAfterMs: 50_000,
      activeCap: 100,
    });
    assertEquals(result.summarized.length, 1);
    assert(result.summarized[0].playbookId !== null, "expected a playbook");
    assertEquals(result.summarized[0].playbookProvenance, "team_discussion");

    const playbooks = listActiveMemories(db, "google", 100_001).filter((m) => m.kind === "playbook");
    assertEquals(playbooks.length, 1);
    assertEquals(playbooks[0].provenance, "team_discussion");
    assertStringIncludes(playbooks[0].content, "Fix (team, Ben Okoro)");
    assertStringIncludes(playbooks[0].content, "batch size");
    assert(!playbooks[0].content.includes("firewall"), "withdrawn hypotheses must not become the playbook");
    assertEquals(playbooks[0].expiresAt, null, "playbooks persist");
  });
});

Deno.test("summarizer: a resolution note takes precedence over the team discussion for playbook provenance", async () => {
  await withTempDb(async (db) => {
    resolveThread(db, "tkt_both", "m1", 1000);
    teamNote(db, "tkt_both", ANA, "Could be the batch size", 2000);
    insertSystemMessage(db, {
      threadId: "tkt_both",
      content: "Raised webhook batch size to 100.",
      customerId: "google",
      metadata: { type: "human_resolution" },
      createdAt: 3000,
    });

    const result = await summarizeOnce(db, createEchoThreadSummarizer(), {
      now: 100_000,
      summarizeAfterMs: 50_000,
      activeCap: 100,
    });
    assertEquals(result.summarized[0].playbookProvenance, "human_resolution");
    const playbooks = listActiveMemories(db, "google", 100_001).filter((m) => m.kind === "playbook");
    assertEquals(playbooks.length, 1);
    assertEquals(playbooks[0].provenance, "human_resolution");
    assertStringIncludes(playbooks[0].content, "Fix (human)");
  });
});

Deno.test("summarizer: a playbook the model returns without any human-taught rows is dropped (provenance is code-assigned)", async () => {
  await withTempDb(async (db) => {
    resolveThread(db, "tkt_plain", "m1", 1000);
    assertEquals(playbookProvenanceFor([]), null);

    const overeager = () =>
      Promise.resolve({ episode: "Webhooks timed out; batch size raised.", playbook: "Symptom: x -> Fix: y" });
    const result = await summarizeOnce(db, overeager, {
      now: 100_000,
      summarizeAfterMs: 50_000,
      activeCap: 100,
    });
    assertEquals(result.summarized.length, 1);
    assertEquals(result.summarized[0].playbookId, null);
    assertEquals(result.summarized[0].playbookProvenance, null);
    const memories = listActiveMemories(db, "google", 100_001);
    assertEquals(memories.map((m) => m.kind), ["episode"]);
  });
});
