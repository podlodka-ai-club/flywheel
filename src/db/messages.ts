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

export type HumanEscalationState =
  | "awaiting_human"
  | "queued"
  | "processing"
  | "continued"
  | "failed";

/**
 * A durable human-in-the-loop exchange derived entirely from message rows.
 * `escalation` is the assistant reply carrying metadata.escalated=true;
 * `response` is the linked internal system event submitted by a colleague;
 * `continuation` is the assistant reply produced from that event.
 */
export interface HumanEscalationRecord {
  escalation: MessageRecord;
  response: MessageRecord | null;
  continuation: MessageRecord | null;
  state: HumanEscalationState;
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
 * resolution notes, spec §3.2 item 5), which the hydrator renders as internal
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
 * Platform-inserted completed system row (spec §3.2 items 5–6): status='completed' keeps
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

export interface InsertHumanEscalationResponseInput {
  /** Completed assistant row carrying metadata.escalated=true. */
  escalationMessageId: string;
  content: string;
  /** Stable external event id for webhook-redelivery deduplication. */
  externalId?: string;
  channel?: string;
  /** Audit label supplied by an authenticated platform adapter. */
  responder?: string;
  createdAt?: number;
}

export type InsertHumanEscalationResponseResult =
  | { outcome: "inserted" | "duplicate"; response: MessageRecord }
  | { outcome: "not_found" | "not_escalated" | "id_conflict"; response: null };

function isEscalatedAssistant(record: MessageRecord): boolean {
  return record.role === "assistant" && record.status === "completed" &&
    record.metadata?.escalated === true;
}

function humanResponseForEscalation(
  db: DatabaseSync,
  escalationMessageId: string,
): MessageRecord | null {
  const row = db.prepare(
    `SELECT * FROM messages
     WHERE role = 'system' AND in_reply_to = ?
       AND json_extract(metadata, '$.type') = 'human_escalation_response'
     ORDER BY created_at ASC, id ASC
     LIMIT 1`,
  ).get(escalationMessageId);
  return row === undefined ? null : rowToRecord(row);
}

/**
 * Hand a ticket back from a human colleague to the agent. The new row is an
 * internal pending event, never customer-authored and never directly
 * deliverable. Thread/customer/reference are inherited from the trusted
 * escalation row; callers cannot redirect a response to another account.
 *
 * INSERT OR IGNORE plus idx_messages_human_escalation_response_once makes
 * concurrent UI submits and at-least-once webhooks one-shot and idempotent.
 */
export function insertHumanEscalationResponse(
  db: DatabaseSync,
  input: InsertHumanEscalationResponseInput,
): InsertHumanEscalationResponseResult {
  const escalation = getMessage(db, input.escalationMessageId);
  if (escalation === null) return { outcome: "not_found", response: null };
  if (!isEscalatedAssistant(escalation)) {
    return { outcome: "not_escalated", response: null };
  }

  const content = input.content.trim();
  if (content === "") throw new Error("human escalation response content is required");
  const id = input.externalId?.trim() || `human_${crypto.randomUUID()}`;
  const escalationReference = typeof escalation.metadata?.escalation_reference === "string"
    ? escalation.metadata.escalation_reference
    : null;
  const metadata: Record<string, unknown> = {
    type: "human_escalation_response",
    channel: input.channel?.trim() || "external-platform",
    escalation_reference: escalationReference,
  };
  if (input.responder?.trim()) metadata.responder = input.responder.trim();

  const result = db.prepare(
    `INSERT OR IGNORE INTO messages
       (id, thread_id, customer_id, role, content, status, in_reply_to, metadata, created_at)
     VALUES (?, ?, ?, 'system', ?, 'pending', ?, ?, ?)`,
  ).run(
    id,
    escalation.threadId,
    escalation.customerId,
    content,
    escalation.id,
    JSON.stringify(metadata),
    input.createdAt ?? Date.now(),
  );
  const response = humanResponseForEscalation(db, escalation.id);
  if (response === null) {
    // INSERT OR IGNORE can also lose on a caller-supplied primary-key clash.
    return { outcome: "id_conflict", response: null };
  }
  return {
    outcome: Number(result.changes) > 0 ? "inserted" : "duplicate",
    response,
  };
}

/**
 * Operator inbox. State is derived rather than mutated, preserving the
 * append-only audit trail of escalation -> human response -> AI continuation.
 */
export function listHumanEscalations(db: DatabaseSync): HumanEscalationRecord[] {
  const escalations = db.prepare(
    `SELECT * FROM messages
     WHERE role = 'assistant' AND status = 'completed'
       AND json_extract(metadata, '$.escalated') = 1
     ORDER BY created_at DESC, id DESC`,
  ).all().map(rowToRecord);

  return escalations.map((escalation) => {
    const response = humanResponseForEscalation(db, escalation.id);
    let continuation: MessageRecord | null = null;
    if (response !== null) {
      const row = db.prepare(
        `SELECT * FROM messages
         WHERE role = 'assistant' AND in_reply_to = ?
         ORDER BY created_at ASC, id ASC
         LIMIT 1`,
      ).get(response.id);
      continuation = row === undefined ? null : rowToRecord(row);
    }
    const state: HumanEscalationState = response === null
      ? "awaiting_human"
      : response.status === "pending"
      ? "queued"
      : response.status === "processing"
      ? "processing"
      : response.status === "failed"
      ? "failed"
      : "continued";
    return { escalation, response, continuation, state };
  });
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
