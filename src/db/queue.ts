import type { DatabaseSync } from "node:sqlite";
import { type MessageRecord, rowToRecord } from "./messages.ts";

/**
 * Atomic claim (spec §4.1): take the oldest pending message whose thread has
 * nothing in flight, marking it processing under this worker's lease. The
 * single UPDATE is atomic under SQLite's write serialization, so concurrent
 * workers (in-process or across processes) can never double-claim, and
 * per-thread FIFO holds.
 */
export function claimNextMessage(
  db: DatabaseSync,
  workerId: string,
  now: number,
): MessageRecord | null {
  const row = db.prepare(
    `UPDATE messages
     SET status = 'processing',
         worker_id = ?,
         locked_at = ?,
         attempt_count = attempt_count + 1
     WHERE id = (
       SELECT id
       FROM messages
       WHERE status = 'pending'
         AND thread_id NOT IN (
           SELECT thread_id FROM messages WHERE status = 'processing'
         )
       ORDER BY created_at ASC, id ASC
       LIMIT 1
     )
     RETURNING *`,
  ).get(workerId, now);
  return row === undefined ? null : rowToRecord(row);
}

/**
 * Freshness check & coalescing (spec §4.3): claim every pending customer
 * message that arrived in this thread while the anchor was being processed.
 * Per-thread serialization (§4.1) guarantees no other worker can take them
 * while the anchor is 'processing', so this single atomic UPDATE is safe.
 * Returned oldest-first.
 */
export function claimThreadFollowUps(
  db: DatabaseSync,
  threadId: string,
  workerId: string,
  now: number,
): MessageRecord[] {
  const rows = db.prepare(
    `UPDATE messages
     SET status = 'processing',
         worker_id = ?,
         locked_at = ?,
         attempt_count = attempt_count + 1
     WHERE thread_id = ? AND status = 'pending' AND role = 'customer'
     RETURNING *`,
  ).all(workerId, now, threadId).map(rowToRecord);
  return rows.sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
}

/**
 * Zombie recovery (spec §4.2): stale leases with retries left go back to
 * 'pending'; stale leases that exhausted retries become terminal 'failed'
 * (surfaced to the platform via idx_messages_failed, spec §3.2).
 */
export function reapExpiredLeases(
  db: DatabaseSync,
  args: { now: number; lockTimeoutMs: number; maxRetries: number },
): { reclaimed: MessageRecord[]; failed: MessageRecord[] } {
  const cutoff = args.now - args.lockTimeoutMs;
  const reclaimed = db.prepare(
    `UPDATE messages
     SET status = 'pending', worker_id = NULL, locked_at = NULL
     WHERE status = 'processing' AND locked_at < ? AND attempt_count < ?
     RETURNING *`,
  ).all(cutoff, args.maxRetries).map(rowToRecord);
  const failed = db.prepare(
    `UPDATE messages
     SET status = 'failed', worker_id = NULL, locked_at = NULL,
         error = COALESCE(error, 'lease expired; retry limit reached')
     WHERE status = 'processing' AND locked_at < ? AND attempt_count >= ?
     RETURNING *`,
  ).all(cutoff, args.maxRetries).map(rowToRecord);
  return { reclaimed, failed };
}

export interface ReplyInsert {
  id: string;
  content: string;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: number | null;
  metadata?: Record<string, unknown> | null;
}

export type CompletionOutcome = "committed" | "lost_lease";

/**
 * Fenced completion (spec §4.4): commits the customer message to 'completed'
 * and inserts the assistant reply in one transaction — but only if this worker
 * still owns the claim. If the lease was reaped and reassigned, the fence
 * matches 0 rows and the whole transaction rolls back ('lost_lease'); the
 * caller must discard the generated reply. The UNIQUE(in_reply_to) index is
 * the database-level backstop: a raced duplicate INSERT throws, which is also
 * reported as 'lost_lease'.
 *
 * The transaction is fully synchronous — no awaits may ever occur inside it.
 */
export function completeWithReply(
  db: DatabaseSync,
  args: {
    anchorId: string;
    threadId: string;
    workerId: string;
    reply: ReplyInsert;
    /** Coalesced follow-up ids (spec §4.3), completed in the same transaction. */
    extraIds?: string[];
    now?: number;
  },
): CompletionOutcome {
  const now = args.now ?? Date.now();
  const ids = [args.anchorId, ...(args.extraIds ?? [])];
  db.exec("BEGIN IMMEDIATE");
  try {
    const fence = db.prepare(
      `UPDATE messages
       SET status = 'completed', completed_at = ?
       WHERE id IN (${ids.map(() => "?").join(", ")})
         AND worker_id = ? AND status = 'processing'`,
    ).run(now, ...ids, args.workerId);
    if (Number(fence.changes) !== ids.length) {
      db.exec("ROLLBACK");
      return "lost_lease";
    }
    db.prepare(
      `INSERT INTO messages
         (id, thread_id, customer_id, role, content, status, in_reply_to,
          model, tokens_in, tokens_out, cost_usd, metadata, created_at, completed_at)
       VALUES (?, ?, (SELECT customer_id FROM messages WHERE id = ?),
               'assistant', ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      args.reply.id,
      args.threadId,
      args.anchorId,
      args.reply.content,
      args.anchorId,
      args.reply.model,
      args.reply.tokensIn,
      args.reply.tokensOut,
      args.reply.costUsd,
      args.reply.metadata == null ? null : JSON.stringify(args.reply.metadata),
      now,
      now,
    );
    db.exec("COMMIT");
    return "committed";
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // transaction already gone
    }
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return "lost_lease";
    }
    throw err;
  }
}

/** Return a claim to the queue (fenced on ownership) for a retryable failure. */
export function releaseClaim(db: DatabaseSync, id: string, workerId: string): boolean {
  const result = db.prepare(
    `UPDATE messages
     SET status = 'pending', worker_id = NULL, locked_at = NULL
     WHERE id = ? AND worker_id = ? AND status = 'processing'`,
  ).run(id, workerId);
  return Number(result.changes) > 0;
}

/** Terminal failure (fenced on ownership): surfaces via idx_messages_failed (spec §3.2). */
export function markFailed(
  db: DatabaseSync,
  id: string,
  workerId: string,
  error: string,
): boolean {
  const result = db.prepare(
    `UPDATE messages
     SET status = 'failed', error = ?, worker_id = NULL, locked_at = NULL
     WHERE id = ? AND worker_id = ? AND status = 'processing'`,
  ).run(error, id, workerId);
  return Number(result.changes) > 0;
}
