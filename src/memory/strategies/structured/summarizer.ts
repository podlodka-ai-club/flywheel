/**
 * End-of-ticket summarizer (spec §10.3, write paths 2 & 3): idle terminal
 * threads get one `episode` memory; threads carrying platform-inserted
 * human_resolution notes additionally get a `playbook` — the self-learning
 * loop that lowers escalation rates over time.
 */
import type { DatabaseSync } from "node:sqlite";
import type { MessageRecord } from "../../../db/messages.ts";
import { getThreadMessages } from "../../../db/messages.ts";
import { logger } from "../../../logger/index.ts";
import { EPISODE_TTL_MS, episodeExists, saveMemory } from "./store.ts";

export interface ThreadSummary {
  /** 1–3 sentences: issue, what was done, outcome. */
  episode: string;
  /** Symptom→fix distilled from a human resolution note; null without one. */
  playbook: string | null;
}

export type ThreadSummarizeFn = (
  input: { threadId: string; customerId: string; messages: MessageRecord[] },
  signal?: AbortSignal,
) => Promise<ThreadSummary>;

export interface SummarizerCandidate {
  threadId: string;
  customerId: string;
}

/**
 * Terminal, idle, unsummarized threads with a verified customer and at least
 * one completed message. Unsummarized = no episode memory yet (the unique
 * index is the concurrency backstop).
 */
export function findSummarizableThreads(
  db: DatabaseSync,
  args: { now: number; summarizeAfterMs: number; limit?: number },
): SummarizerCandidate[] {
  // deno-lint-ignore no-explicit-any
  return db.prepare(
    `SELECT thread_id, MAX(customer_id) AS customer_id
     FROM messages
     GROUP BY thread_id
     HAVING SUM(status IN ('pending', 'processing')) = 0
        AND SUM(status = 'completed') > 0
        AND MAX(customer_id) IS NOT NULL
        AND MAX(created_at) < ?
        AND thread_id NOT IN (
          SELECT source_thread_id FROM memories
          WHERE kind = 'episode' AND source_thread_id IS NOT NULL
        )
     LIMIT ?`,
  ).all(args.now - args.summarizeAfterMs, args.limit ?? 10)
    .map((row: any) => ({ threadId: row.thread_id, customerId: row.customer_id }));
}

export interface SummarizeOnceResult {
  summarized: { threadId: string; episodeId: string; playbookId: string | null }[];
  errors: number;
}

export async function summarizeOnce(
  db: DatabaseSync,
  summarize: ThreadSummarizeFn,
  args: { now: number; summarizeAfterMs: number; activeCap: number },
  signal?: AbortSignal,
): Promise<SummarizeOnceResult> {
  const result: SummarizeOnceResult = { summarized: [], errors: 0 };
  for (const candidate of findSummarizableThreads(db, args)) {
    if (signal?.aborted) break;
    try {
      const messages = getThreadMessages(db, candidate.threadId)
        .filter((m) => m.status === "completed");
      const summary = await summarize(
        { threadId: candidate.threadId, customerId: candidate.customerId, messages },
        signal,
      );
      if (episodeExists(db, candidate.threadId)) continue; // raced another process
      const episode = saveMemory(db, {
        customerId: candidate.customerId,
        kind: "episode",
        content: summary.episode,
        provenance: "ticket_summary",
        sourceThreadId: candidate.threadId,
        expiresAt: args.now + EPISODE_TTL_MS,
        activeCap: args.activeCap,
        now: args.now,
      });
      let playbookId: string | null = null;
      if (summary.playbook !== null && summary.playbook.trim() !== "") {
        playbookId = saveMemory(db, {
          customerId: candidate.customerId,
          kind: "playbook",
          content: summary.playbook.trim(),
          provenance: "human_resolution",
          sourceThreadId: candidate.threadId,
          activeCap: args.activeCap,
          now: args.now,
        }).id;
      }
      result.summarized.push({
        threadId: candidate.threadId,
        episodeId: episode.id,
        playbookId,
      });
      logger.info("thread_summarized", {
        threadId: candidate.threadId,
        customerId: candidate.customerId,
        episodeId: episode.id,
        playbookId,
      });
    } catch (err) {
      // UNIQUE violation = another process summarized concurrently: fine.
      if (err instanceof Error && err.message.includes("UNIQUE")) continue;
      result.errors++;
      logger.error("summarizer_error", {
        threadId: candidate.threadId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return result;
}

export interface SummarizerOptions {
  summarizeAfterMs: number;
  activeCap: number;
  summarize: ThreadSummarizeFn;
}

export interface Summarizer {
  stop(): Promise<void>;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(() => resolve(), ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

export function startSummarizer(db: DatabaseSync, options: SummarizerOptions): Summarizer {
  const abort = new AbortController();
  const intervalMs = Math.max(5_000, Math.min(60_000, options.summarizeAfterMs / 4));

  const loop = (async () => {
    logger.debug("summarizer_started", {
      intervalMs,
      summarizeAfterMs: options.summarizeAfterMs,
    });
    while (!abort.signal.aborted) {
      try {
        await summarizeOnce(db, options.summarize, {
          now: Date.now(),
          summarizeAfterMs: options.summarizeAfterMs,
          activeCap: options.activeCap,
        }, abort.signal);
      } catch (err) {
        logger.error("summarizer_error", { error: String(err) });
      }
      await sleep(intervalMs, abort.signal);
    }
    logger.debug("summarizer_stopped", {});
  })();

  return {
    async stop(): Promise<void> {
      abort.abort();
      await loop;
    },
  };
}

// ---------------------------------------------------------------------------
// Summarize implementations

function humanResolutionNotes(messages: MessageRecord[]): MessageRecord[] {
  return messages.filter((m) =>
    m.role === "system" && (m.metadata as { type?: string } | null)?.type === "human_resolution"
  );
}

/** Deterministic summarizer for AGENT_MODE=echo — memory is testable key-free. */
export function createEchoThreadSummarizer(): ThreadSummarizeFn {
  return (input) => {
    const firstCustomer = input.messages.find((m) => m.role === "customer");
    const lastAssistant = [...input.messages].reverse().find((m) => m.role === "assistant");
    const resolutions = humanResolutionNotes(input.messages);
    const episode = `Ticket about: ${(firstCustomer?.content ?? "(no customer message)").slice(0, 120)} | ` +
      `Outcome: ${(lastAssistant?.content ?? "(no reply)").slice(0, 120)}`;
    const playbook = resolutions.length > 0
      ? `When: ${(firstCustomer?.content ?? "similar issue").slice(0, 100)} | Fix (human): ${
        resolutions.map((m) => m.content).join(" ").slice(0, 200)
      }`
      : null;
    return Promise.resolve({ episode, playbook });
  };
}
