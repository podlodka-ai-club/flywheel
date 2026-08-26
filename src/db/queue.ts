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
    now?: number;
  },
): CompletionOutcome {
  const now = args.now ?? Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    const fence = db.prepare(
      `UPDATE messages
       SET status = 'completed', completed_at = ?
       WHERE id = ? AND worker_id = ? AND status = 'processing'`,
    ).run(now, args.anchorId, args.workerId);
    if (Number(fence.changes) !== 1) {
      db.exec("ROLLBACK");
      return "lost_lease";
    }
    db.prepare(
      `INSERT INTO messages
         (id, thread_id, role, content, status, in_reply_to,
          model, tokens_in, tokens_out, cost_usd, metadata, created_at, completed_at)
       VALUES (?, ?, 'assistant', ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      args.reply.id,
      args.threadId,
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
