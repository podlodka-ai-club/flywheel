/**
 * End-of-ticket summarizer (spec §10.3, write paths 2 & 3): terminal threads
 * get one `episode` memory; threads carrying platform-inserted
 * human_resolution notes or an internal team discussion (internal_note rows)
 * additionally get a `playbook` — the self-learning loop that lowers
 * escalation rates over time. Playbook provenance is assigned here from the
 * row types present, never from what the model claims. Two triggers feed the same
 * pipeline: the idle sweep (`summarizeOnce`, run as the strategy's job on
 * `summarizerIntervalMs`) and the platform's ticket_closed note
 * (`summarizeThreadNow`, from the strategy's event handler). The unique
 * episode index makes them idempotent against each other and across engine
 * processes. The loop plumbing itself lives in the memory runtime.
 */
import type { DatabaseSync } from "node:sqlite";
import type { MessageRecord } from "../../../db/messages.ts";
import { getThreadMessages } from "../../../db/messages.ts";
import { logger } from "../../../logger/index.ts";
import { EPISODE_TTL_MS, episodeExists, type MemoryProvenance, saveMemory } from "./store.ts";

export interface ThreadSummary {
  /** 1–3 sentences: issue, what was done, outcome. */
  episode: string;
  /**
   * Symptom→fix distilled from a human resolution note or the conclusion of
   * the internal team discussion; null without either. Persisted only when
   * the transcript actually carries such rows (playbookProvenanceFor).
   */
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

/** Sweep cadence: a quarter of the idle threshold, clamped to 5s–60s. */
export function summarizerIntervalMs(summarizeAfterMs: number): number {
  return Math.max(5_000, Math.min(60_000, summarizeAfterMs / 4));
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

/**
 * The same eligibility as the sweep for ONE thread, minus the idle wait:
 * terminal, verified, at least one completed row, no episode yet. Null when
 * the thread does not (yet) qualify — e.g. a reply is still in flight.
 */
export function findThreadCandidate(db: DatabaseSync, threadId: string): SummarizerCandidate | null {
  const row = db.prepare(
    `SELECT thread_id, MAX(customer_id) AS customer_id
     FROM messages
     WHERE thread_id = ?
     GROUP BY thread_id
     HAVING SUM(status IN ('pending', 'processing')) = 0
        AND SUM(status = 'completed') > 0
        AND MAX(customer_id) IS NOT NULL
        AND thread_id NOT IN (
          SELECT source_thread_id FROM memories
          WHERE kind = 'episode' AND source_thread_id IS NOT NULL
        )`,
  ).get(threadId) as { thread_id: string; customer_id: string } | undefined;
  return row === undefined ? null : { threadId: row.thread_id, customerId: row.customer_id };
}

export interface SummarizeThreadArgs {
  now: number;
  activeCap: number;
  /** What caused this summarization — logged on `thread_summarized`. */
  trigger: "sweep" | "ticket_closed" | "agent_reply";
}

export interface SummarizedThread {
  threadId: string;
  episodeId: string;
  playbookId: string | null;
  playbookProvenance: MemoryProvenance | null;
}

/**
 * Summarize one candidate: render its completed rows, ask the summarizer,
 * write the episode (+ playbook). Returns null when another process got
 * there first (re-check after the await, or the UNIQUE index); any other
 * error propagates to the caller.
 */
export async function summarizeThread(
  db: DatabaseSync,
  summarize: ThreadSummarizeFn,
  candidate: SummarizerCandidate,
  args: SummarizeThreadArgs,
  signal?: AbortSignal,
): Promise<SummarizedThread | null> {
  const messages = getThreadMessages(db, candidate.threadId)
    .filter((m) => m.status === "completed");
  const summary = await summarize(
    { threadId: candidate.threadId, customerId: candidate.customerId, messages },
    signal,
  );
  if (episodeExists(db, candidate.threadId)) return null; // raced another process
  try {
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
    // Provenance comes from the rows on the bus, not from the model: a
    // playbook returned for a thread with neither note type is dropped.
    const playbookProvenance = playbookProvenanceFor(messages);
    let playbookId: string | null = null;
    if (
      playbookProvenance !== null && summary.playbook !== null && summary.playbook.trim() !== ""
    ) {
      playbookId = saveMemory(db, {
        customerId: candidate.customerId,
        kind: "playbook",
        content: summary.playbook.trim(),
        provenance: playbookProvenance,
        sourceThreadId: candidate.threadId,
        activeCap: args.activeCap,
        now: args.now,
      }).id;
    }
    logger.info("thread_summarized", {
      threadId: candidate.threadId,
      customerId: candidate.customerId,
      episodeId: episode.id,
      playbookId,
      playbookProvenance: playbookId === null ? null : playbookProvenance,
      trigger: args.trigger,
    });
    return {
      threadId: candidate.threadId,
      episodeId: episode.id,
      playbookId,
      playbookProvenance: playbookId === null ? null : playbookProvenance,
    };
  } catch (err) {
    // UNIQUE violation = another process summarized concurrently: fine.
    if (err instanceof Error && err.message.includes("UNIQUE")) return null;
    throw err;
  }
}

export interface SummarizeOnceResult {
  summarized: SummarizedThread[];
  errors: number;
}

/** One idle sweep (the strategy's `summarizer` job). */
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
      const summarized = await summarizeThread(
        db,
        summarize,
        candidate,
        { now: args.now, activeCap: args.activeCap, trigger: "sweep" },
        signal,
      );
      if (summarized !== null) result.summarized.push(summarized);
    } catch (err) {
      result.errors++;
      logger.error("summarizer_error", {
        threadId: candidate.threadId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return result;
}

/**
 * Event-triggered summarization (spec §10.3): summarize ONE thread right
 * away if it qualifies, ignoring the idle wait. Null = skipped (already
 * summarized, no verified customer, or not terminal — a reply in flight);
 * the sweep and the next event remain the fallback. Errors propagate so the
 * memory runtime can retry the event.
 */
export async function summarizeThreadNow(
  db: DatabaseSync,
  summarize: ThreadSummarizeFn,
  threadId: string,
  args: SummarizeThreadArgs,
  signal?: AbortSignal,
): Promise<SummarizedThread | null> {
  const candidate = findThreadCandidate(db, threadId);
  if (candidate === null) {
    logger.debug("summarize_skipped", { threadId, trigger: args.trigger });
    return null;
  }
  return await summarizeThread(db, summarize, candidate, args, signal);
}

// ---------------------------------------------------------------------------
// Summarize implementations

function systemNotesOfType(messages: MessageRecord[], type: string): MessageRecord[] {
  return messages.filter((m) =>
    m.role === "system" && (m.metadata as { type?: string } | null)?.type === type
  );
}

function humanResolutionNotes(messages: MessageRecord[]): MessageRecord[] {
  return systemNotesOfType(messages, "human_resolution");
}

/** Internal team discussion rows (spec §3.2 item 7), oldest first. */
export function internalTeamNotes(messages: MessageRecord[]): MessageRecord[] {
  return systemNotesOfType(messages, "internal_note");
}

/** Display name embedded in an internal_note row; the directory is not consulted. */
export function internalNoteAuthor(message: MessageRecord): string {
  const author = (message.metadata as { author?: { name?: unknown } } | null)?.author;
  return typeof author?.name === "string" && author.name.trim() !== "" ? author.name : "colleague";
}

/**
 * Which human-taught source a playbook for this transcript is attributed to:
 * an explicit resolution note wins over the team discussion; without either
 * no playbook may be stored, whatever the summarizer returned.
 */
export function playbookProvenanceFor(messages: MessageRecord[]): MemoryProvenance | null {
  if (humanResolutionNotes(messages).length > 0) return "human_resolution";
  if (internalTeamNotes(messages).length > 0) return "team_discussion";
  return null;
}

/** Deterministic summarizer for AGENT_MODE=echo — memory is testable key-free. */
export function createEchoThreadSummarizer(): ThreadSummarizeFn {
  return (input) => {
    const firstCustomer = input.messages.find((m) => m.role === "customer");
    const lastAssistant = [...input.messages].reverse().find((m) => m.role === "assistant");
    const resolutions = humanResolutionNotes(input.messages);
    const teamNotes = internalTeamNotes(input.messages);
    const symptom = (firstCustomer?.content ?? "similar issue").slice(0, 100);
    const episode = `Ticket about: ${(firstCustomer?.content ?? "(no customer message)").slice(0, 120)} | ` +
      `Outcome: ${(lastAssistant?.content ?? "(no reply)").slice(0, 120)}`;
    let playbook: string | null = null;
    if (resolutions.length > 0) {
      playbook = `When: ${symptom} | Fix (human): ${
        resolutions.map((m) => m.content).join(" ").slice(0, 200)
      }`;
    } else if (teamNotes.length > 0) {
      // The last note stands in for "the conclusion the team reached" — the
      // deterministic proxy for what the LLM summarizer distills.
      const conclusion = teamNotes[teamNotes.length - 1];
      playbook = `When: ${symptom} | Fix (team, ${internalNoteAuthor(conclusion)}): ${
        conclusion.content.slice(0, 200)
      }`;
    }
    return Promise.resolve({ episode, playbook });
  };
}
