/**
 * Data access for the `messages` table — the sole queue/conversation store
 * and the integration contract with the external ticketing platform (spec
 * §3.2). Contains the MessageRecord row mapping plus the contract's
 * operations: deduplicated customer ingest, thread reads and the hydration
 * source, the bus tail the memory runtime consumes (rows by rowid), platform-
 * inserted system rows, the dispatcher's delivery stamp, the failure
 * poll/ack, and the dev-harness thread listing and deletion.
 * (Claiming/completion mechanics live in queue.ts.)
 */
import type { DatabaseSync } from "node:sqlite";

export type Role = "customer" | "assistant" | "system";
export type Status = "pending" | "processing" | "completed" | "failed";

export interface MessageRecord {
  id: string;
  threadId: string;
  customerId: string | null;
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
export function rowToRecord(row: any): MessageRecord {
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
    customerId: row.customer_id ?? null,
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
  /** Stable customer/account ID issued by the external platform (spec §3.2). */
  customerId?: string;
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
    `INSERT OR IGNORE INTO messages (id, thread_id, customer_id, role, content, status, metadata, created_at)
     VALUES (?, ?, ?, 'customer', ?, 'pending', ?, ?)`,
  ).run(
    input.id,
    input.threadId,
    input.customerId ?? null,
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

/**
 * Hydration source (spec §5.1): the completed conversational rows of a thread,
 * oldest first — including platform-inserted system rows (e.g. human
 * resolution notes, spec §3.2 item 4), which the hydrator renders as internal
 * context. The in-flight (processing) anchor message is NOT included — the
 * worker passes its content to the agent separately.
 */
export function getCompletedThreadHistory(db: DatabaseSync, threadId: string): MessageRecord[] {
  return db.prepare(
    `SELECT * FROM messages
     WHERE thread_id = ? AND status = 'completed'
     ORDER BY created_at ASC, id ASC`,
  ).all(threadId).map(rowToRecord);
}

/** A row with its position on the bus (SQLite rowid) — the memory runtime's tail unit. */
export interface SequencedMessage {
  sequence: number;
  message: MessageRecord;
}

/**
 * Bus tail (spec §10.8): rows inserted after `sequence`, in insert order.
 * rowid is the table's b-tree key, so this is a seek, not a scan — and with
 * SQLite's single writer, insert order is commit order: a row shows up here
 * only once the transaction that produced it committed.
 */
export function listMessagesAfter(db: DatabaseSync, sequence: number, limit: number): SequencedMessage[] {
  // deno-lint-ignore no-explicit-any
  return db.prepare(
    "SELECT rowid AS sequence, * FROM messages WHERE rowid > ? ORDER BY rowid ASC LIMIT ?",
  ).all(sequence, limit).map((row: any) => ({ sequence: Number(row.sequence), message: rowToRecord(row) }));
}

/** Highest position on the bus (0 for an empty table) — where a new tail starts. */
export function latestMessageSequence(db: DatabaseSync): number {
  const row = db.prepare("SELECT COALESCE(MAX(rowid), 0) AS sequence FROM messages").get() as { sequence: number };
  return Number(row.sequence);
}

/** A thread as of a bus position: its rows that landed at or before `sequence`, oldest first. */
export function getThreadMessagesUpTo(db: DatabaseSync, threadId: string, sequence: number): MessageRecord[] {
  return db.prepare(
    "SELECT * FROM messages WHERE thread_id = ? AND rowid <= ? ORDER BY created_at ASC, id ASC",
  ).all(threadId, sequence).map(rowToRecord);
}

export interface InsertSystemMessageInput {
  threadId: string;
  content: string;
  customerId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: number;
}

/**
 * Platform-inserted system row (spec §3.2 item 4): status='completed' keeps
 * it unclaimable — the engine never replies to it, only learns from it.
 */
export function insertSystemMessage(
  db: DatabaseSync,
  input: InsertSystemMessageInput,
): MessageRecord {
  const id = `sys_${crypto.randomUUID()}`;
  const now = input.createdAt ?? Date.now();
  db.prepare(
    `INSERT INTO messages (id, thread_id, customer_id, role, content, status, metadata, created_at, completed_at)
     VALUES (?, ?, ?, 'system', ?, 'completed', ?, ?, ?)`,
  ).run(
    id,
    input.threadId,
    input.customerId ?? null,
    input.content,
    input.metadata === undefined ? null : JSON.stringify(input.metadata),
    now,
    now,
  );
  return getMessage(db, id)!;
}

/**
 * Dispatcher contract (spec §3.2): stamp delivery on a completed assistant
 * reply. Guarded so only deliverable rows are stamped, exactly once.
 */
export function markDelivered(db: DatabaseSync, id: string, now: number): boolean {
  const result = db.prepare(
    `UPDATE messages SET sent_to_customer_at = ?
     WHERE id = ? AND role = 'assistant' AND status = 'completed' AND sent_to_customer_at IS NULL`,
  ).run(now, id);
  return Number(result.changes) > 0;
}

/**
 * The external platform's failure poll (spec §3.2, idx_messages_failed):
 * terminal failures nobody has routed to a human yet.
 */
export function listUnacknowledgedFailed(db: DatabaseSync): MessageRecord[] {
  return db.prepare(
    `SELECT * FROM messages
     WHERE status = 'failed' AND sent_to_customer_at IS NULL
     ORDER BY created_at ASC, id ASC`,
  ).all().map(rowToRecord);
}

/**
 * Acknowledge a failed message after routing the thread to a human. On
 * failed customer rows sent_to_customer_at means "failure handled" (§3.2).
 */
export function acknowledgeFailed(db: DatabaseSync, id: string, now: number): boolean {
  const result = db.prepare(
    `UPDATE messages SET sent_to_customer_at = ?
     WHERE id = ? AND status = 'failed' AND sent_to_customer_at IS NULL`,
  ).run(now, id);
  return Number(result.changes) > 0;
}

/**
 * Dev-harness convenience: drop a whole thread's rows. Safe against in-flight
 * workers — their fenced completion then matches 0 rows and rolls back
 * ('lost_lease'), so the generated reply is discarded, never resurrected.
 */
export function deleteThread(db: DatabaseSync, threadId: string): number {
  const result = db.prepare(`DELETE FROM messages WHERE thread_id = ?`).run(threadId);
  return Number(result.changes);
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
