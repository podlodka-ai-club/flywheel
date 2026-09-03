/**
 * Memory runtime (spec §10.8): the engine-side driver of a memory strategy's
 * asynchronous ports. It runs the strategy's declared jobs as abortable
 * loops (schedule port) and tails the messages bus into the strategy's
 * event handler (event port), so strategies declare what they react to and
 * how often they run without writing pollers or timers. Started once by the
 * engine next to the worker pool and the reaper; never by the dev harness.
 *
 * Event delivery: the tail reads rows by rowid after a per-strategy cursor
 * (memory_cursors), classifies each row, drops rows without a verified
 * customer, calls the handler for subscribed types in bus order, and
 * advances the cursor by compare-and-swap after each row. A handler that
 * throws is retried up to `eventMaxAttempts` times, then the row is skipped
 * with `memory_event_dropped`. Delivery is at-least-once — a crash between
 * handling and advancing replays the row, and two engines running the same
 * strategy may both deliver — so handlers must be idempotent. A strategy seen
 * for the first time starts at the current end of the bus, not at row one;
 * set its cursor to zero while stopped to replay retained history; deleting
 * its memory_cursors row makes the next start resume at the current tail.
 */
import type { DatabaseSync } from "node:sqlite";
import {
  getThreadMessagesUpTo,
  latestMessageSequence,
  listMessagesAfter,
  type MessageRecord,
} from "../db/messages.ts";
import { logger } from "../logger/index.ts";
import type {
  MemoryEvent,
  MemoryEventHandler,
  MemoryEventType,
  MemoryJobSpec,
  MemoryStrategy,
} from "./strategy.ts";

export interface MemoryRuntimeOptions {
  /** Bus-tail cadence when idle (MEMORY_EVENT_POLL_MS); also the retry delay. */
  eventPollMs: number;
  /** Handler attempts per event before it is dropped (default 3). */
  eventMaxAttempts?: number;
  /** Rows read per tail query (default 100). */
  eventBatchSize?: number;
}

export interface MemoryRuntime {
  /** Stops the jobs and the tail, then calls the strategy's close(). */
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

/** Row → event type (the spec §10.8 event table). */
export function classifyMessage(message: MessageRecord): MemoryEventType {
  if (message.role === "customer") return "customer_message";
  if (message.role === "assistant") return "agent_reply";
  const type = (message.metadata as { type?: unknown } | null)?.type;
  if (type === "human_resolution") return "human_resolution";
  if (type === "ticket_closed") return "ticket_closed";
  if (type === "internal_note") return "internal_note";
  return "system_note";
}

// ---------------------------------------------------------------------------
// Cursor bookkeeping (memory_cursors, one row per strategy)

/** Where the strategy's tail resumes; a first sighting starts at the end of the bus. */
export function loadCursor(db: DatabaseSync, strategy: string, now: number): number {
  db.prepare(
    `INSERT OR IGNORE INTO memory_cursors (strategy, last_sequence, updated_at) VALUES (?, ?, ?)`,
  ).run(strategy, latestMessageSequence(db), now);
  const row = db.prepare(
    `SELECT last_sequence FROM memory_cursors WHERE strategy = ?`,
  ).get(strategy) as { last_sequence: number };
  return Number(row.last_sequence);
}

/**
 * Compare-and-swap advance from `from` to `to`. Returns the position to
 * continue from: `to` when this process advanced the cursor, otherwise the
 * higher of `to` and what another process left — a cursor never regresses.
 */
export function advanceCursor(
  db: DatabaseSync,
  strategy: string,
  from: number,
  to: number,
  now: number,
): number {
  const result = db.prepare(
    `UPDATE memory_cursors SET last_sequence = ?, updated_at = ?
     WHERE strategy = ? AND last_sequence = ?`,
  ).run(to, now, strategy, from);
  if (Number(result.changes) === 1) return to;
  const row = db.prepare(
    `SELECT last_sequence FROM memory_cursors WHERE strategy = ?`,
  ).get(strategy) as { last_sequence: number } | undefined;
  if (row === undefined) {
    // Operator deleted the row mid-run: preserve forward progress by
    // re-seating it at the event this process just handled.
    db.prepare(
      `INSERT OR IGNORE INTO memory_cursors (strategy, last_sequence, updated_at) VALUES (?, ?, ?)`,
    ).run(strategy, to, now);
    return to;
  }
  return Math.max(to, Number(row.last_sequence));
}

// ---------------------------------------------------------------------------

export function startMemoryRuntime(
  db: DatabaseSync,
  strategy: MemoryStrategy,
  options: MemoryRuntimeOptions,
): MemoryRuntime {
  const abort = new AbortController();
  const maxAttempts = Math.max(1, options.eventMaxAttempts ?? 3);
  const batchSize = Math.max(1, options.eventBatchSize ?? 100);

  async function runJob(job: MemoryJobSpec): Promise<void> {
    logger.debug("memory_job_started", {
      strategy: strategy.name,
      job: job.name,
      intervalMs: job.intervalMs,
    });
    while (!abort.signal.aborted) {
      try {
        await job.run(abort.signal);
      } catch (err) {
        logger.error("memory_job_failed", {
          strategy: strategy.name,
          job: job.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      await sleep(job.intervalMs, abort.signal);
    }
    logger.debug("memory_job_stopped", { strategy: strategy.name, job: job.name });
  }

  function makeEvent(sequence: number, message: MessageRecord, type: MemoryEventType): MemoryEvent {
    let thread: MessageRecord[] | undefined;
    return {
      type,
      customerId: message.customerId as string,
      threadId: message.threadId,
      message,
      sequence,
      thread: () => (thread ??= getThreadMessagesUpTo(db, message.threadId, sequence)),
    };
  }

  async function runTail(handler: MemoryEventHandler): Promise<void> {
    const types = new Set(handler.types);
    // Loaded before the first await: rows inserted after startMemoryRuntime()
    // returns are guaranteed to be seen.
    let cursor = loadCursor(db, strategy.name, Date.now());
    logger.debug("memory_tail_started", {
      strategy: strategy.name,
      cursor,
      types: [...types],
      pollMs: options.eventPollMs,
    });
    let attempts = 0; // handler attempts on the row at the head of the tail
    while (!abort.signal.aborted) {
      const batch = listMessagesAfter(db, cursor, batchSize);
      if (batch.length === 0) {
        await sleep(options.eventPollMs, abort.signal);
        continue;
      }
      let retry = false;
      for (const { sequence, message } of batch) {
        if (abort.signal.aborted) break;
        const type = classifyMessage(message);
        // No verified customer → no memory of any kind (spec §10.1).
        if (message.customerId !== null && types.has(type)) {
          const startedAt = Date.now();
          try {
            await handler.handle(makeEvent(sequence, message, type), abort.signal);
            logger.info("memory_event_handled", {
              strategy: strategy.name,
              type,
              threadId: message.threadId,
              customerId: message.customerId,
              messageId: message.id,
              sequence,
              durationMs: Date.now() - startedAt,
            });
          } catch (err) {
            // Shutdown mid-handler: neither counted nor advanced — replays on restart.
            if (abort.signal.aborted) break;
            attempts++;
            const error = err instanceof Error ? err.message : String(err);
            if (attempts < maxAttempts) {
              logger.warn("memory_event_failed", {
                strategy: strategy.name,
                type,
                threadId: message.threadId,
                customerId: message.customerId,
                messageId: message.id,
                sequence,
                attempt: attempts,
                error,
              });
              retry = true;
              break; // re-read from the same cursor: this row comes first again
            }
            logger.error("memory_event_dropped", {
              strategy: strategy.name,
              type,
              threadId: message.threadId,
              customerId: message.customerId,
              messageId: message.id,
              sequence,
              attempts,
              error,
            });
          }
        }
        attempts = 0;
        const next = advanceCursor(db, strategy.name, cursor, sequence, Date.now());
        cursor = next;
        // Another engine moved ahead of us: the rest of this batch is theirs.
        if (next > sequence) break;
      }
      if (retry) await sleep(options.eventPollMs, abort.signal);
    }
    logger.debug("memory_tail_stopped", { strategy: strategy.name, cursor });
  }

  const loops: Promise<void>[] = (strategy.jobs ?? []).map((job) => runJob(job));
  if (strategy.events !== undefined) loops.push(runTail(strategy.events));

  return {
    async stop(): Promise<void> {
      abort.abort();
      await Promise.all(loops);
      await strategy.close?.();
    },
  };
}
