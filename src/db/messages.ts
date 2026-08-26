import type { DatabaseSync } from "node:sqlite";

export type Role = "customer" | "assistant" | "system";
export type Status = "pending" | "processing" | "completed" | "failed";

export interface MessageRecord {
  id: string;
  threadId: string;
  role: Role;
  content: string;
  status: Status;
  inReplyTo: string | null;
  workerId: string | null;
  lockedAt: number | null;
  attemptCount: number;
  error: string | null;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: number | null;
  metadata: Record<string, unknown> | null;
  sentToCustomerAt: number | null;
  createdAt: number;
  completedAt: number | null;
}

export interface ThreadSummary {
  threadId: string;
  messageCount: number;
  lastActivityAt: number;
  lastContent: string;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
}

// deno-lint-ignore no-explicit-any
function rowToRecord(row: any): MessageRecord {
  let metadata: Record<string, unknown> | null = null;
  if (row.metadata != null) {
    try {
      metadata = JSON.parse(row.metadata);
    } catch {
      metadata = { unparseable: String(row.metadata) };
    }
  }
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    status: row.status,
    inReplyTo: row.in_reply_to ?? null,
    workerId: row.worker_id ?? null,
    lockedAt: row.locked_at ?? null,
    attemptCount: Number(row.attempt_count ?? 0),
    error: row.error ?? null,
    model: row.model ?? null,
    tokensIn: row.tokens_in ?? null,
    tokensOut: row.tokens_out ?? null,
    costUsd: row.cost_usd ?? null,
    metadata,
    sentToCustomerAt: row.sent_to_customer_at ?? null,
    createdAt: Number(row.created_at),
    completedAt: row.completed_at ?? null,
  };
}

export interface InsertCustomerMessageInput {
  id: string;
  threadId: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt?: number;
}

/**
 * Ingest contract (spec §3.2): `id` is the external platform's message ID and
 * INSERT OR IGNORE makes at-least-once webhook redelivery a no-op.
 * Returns whether a row was actually inserted (false = deduplicated).
 */
export function insertCustomerMessage(
  db: DatabaseSync,
  input: InsertCustomerMessageInput,
): { inserted: boolean } {
  const result = db.prepare(
    `INSERT OR IGNORE INTO messages (id, thread_id, role, content, status, metadata, created_at)
     VALUES (?, ?, 'customer', ?, 'pending', ?, ?)`,
  ).run(
    input.id,
    input.threadId,
    input.content,
    input.metadata === undefined ? null : JSON.stringify(input.metadata),
    input.createdAt ?? Date.now(),
  );
  return { inserted: Number(result.changes) > 0 };
}

export function getMessage(db: DatabaseSync, id: string): MessageRecord | null {
  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
  return row === undefined ? null : rowToRecord(row);
}

export function getThreadMessages(db: DatabaseSync, threadId: string): MessageRecord[] {
  return db.prepare(
    "SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC, id ASC",
  ).all(threadId).map(rowToRecord);
}

export function listThreads(db: DatabaseSync): ThreadSummary[] {
  // deno-lint-ignore no-explicit-any
  return db.prepare(
    `SELECT
       thread_id,
       COUNT(*) AS message_count,
       MAX(created_at) AS last_activity_at,
       (SELECT content FROM messages last
        WHERE last.thread_id = m.thread_id
        ORDER BY last.created_at DESC, last.id DESC LIMIT 1) AS last_content,
       SUM(status = 'pending') AS pending_count,
       SUM(status = 'processing') AS processing_count,
       SUM(status = 'completed') AS completed_count,
       SUM(status = 'failed') AS failed_count
     FROM messages m
     GROUP BY thread_id
     ORDER BY last_activity_at DESC`,
  ).all().map((row: any) => ({
    threadId: row.thread_id,
    messageCount: Number(row.message_count),
    lastActivityAt: Number(row.last_activity_at),
    lastContent: row.last_content ?? "",
    pendingCount: Number(row.pending_count),
    processingCount: Number(row.processing_count),
    completedCount: Number(row.completed_count),
    failedCount: Number(row.failed_count),
  }));
}
