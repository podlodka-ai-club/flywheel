/**
 * Per-customer memory store (spec §10). Every query is keyed by customer_id —
 * isolation is enforced here, not left to callers. Provenance is mandatory
 * and always assigned by engine code, never by the model.
 */
import type { DatabaseSync } from "node:sqlite";
import { logger } from "../logger/index.ts";

export type MemoryKind = "fact" | "episode" | "playbook";
export type MemoryProvenance =
  | "customer_stated"
  | "agent_inferred"
  | "ticket_summary"
  | "human_resolution";

export interface MemoryRecord {
  id: string;
  customerId: string;
  kind: MemoryKind;
  content: string;
  provenance: MemoryProvenance;
  sourceThreadId: string | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  supersededBy: string | null;
  archivedAt: number | null;
}

/** Episodes decay by default (spec §10.6); facts and playbooks persist. */
export const EPISODE_TTL_MS = 180 * 24 * 60 * 60 * 1000;

// deno-lint-ignore no-explicit-any
function rowToMemory(row: any): MemoryRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    kind: row.kind,
    content: row.content,
    provenance: row.provenance,
    sourceThreadId: row.source_thread_id ?? null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    expiresAt: row.expires_at ?? null,
    supersededBy: row.superseded_by ?? null,
    archivedAt: row.archived_at ?? null,
  };
}

export interface SaveMemoryInput {
  customerId: string;
  kind: MemoryKind;
  content: string;
  provenance: MemoryProvenance;
  sourceThreadId?: string;
  /** Id of an active memory of the SAME customer this one corrects. */
  supersedes?: string;
  expiresAt?: number;
  /** Oldest-archived-first cap on active memories (spec §10.5). */
  activeCap?: number;
  now?: number;
}

export function saveMemory(db: DatabaseSync, input: SaveMemoryInput): MemoryRecord {
  const now = input.now ?? Date.now();
  const id = `mem_${crypto.randomUUID()}`;

  if (input.supersedes !== undefined) {
    // Fenced on customer_id: superseding another customer's memory is impossible.
    const superseded = db.prepare(
      `UPDATE memories SET superseded_by = ?, updated_at = ?
       WHERE id = ? AND customer_id = ? AND archived_at IS NULL AND superseded_by IS NULL`,
    ).run(id, now, input.supersedes, input.customerId);
    if (Number(superseded.changes) !== 1) {
      throw new Error(
        `Cannot supersede memory "${input.supersedes}": not found among this customer's active memories.`,
      );
    }
  }

  if (input.activeCap !== undefined) {
    const active = countActiveMemories(db, input.customerId, now);
    if (active >= input.activeCap) {
      db.prepare(
        `UPDATE memories SET archived_at = ?
         WHERE id IN (
           SELECT id FROM memories
           WHERE customer_id = ? AND archived_at IS NULL AND superseded_by IS NULL
           ORDER BY updated_at ASC
           LIMIT ?
         )`,
      ).run(now, input.customerId, active - input.activeCap + 1);
    }
  }

  db.prepare(
    `INSERT INTO memories
       (id, customer_id, kind, content, provenance, source_thread_id,
        created_at, updated_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.customerId,
    input.kind,
    input.content,
    input.provenance,
    input.sourceThreadId ?? null,
    now,
    now,
    input.expiresAt ?? null,
  );
  return {
    id,
    customerId: input.customerId,
    kind: input.kind,
    content: input.content,
    provenance: input.provenance,
    sourceThreadId: input.sourceThreadId ?? null,
    createdAt: now,
    updatedAt: now,
    expiresAt: input.expiresAt ?? null,
    supersededBy: null,
    archivedAt: null,
  };
}

export function countActiveMemories(db: DatabaseSync, customerId: string, now: number): number {
  const row = db.prepare(
    `SELECT COUNT(*) AS n FROM memories
     WHERE customer_id = ? AND archived_at IS NULL AND superseded_by IS NULL
       AND (expires_at IS NULL OR expires_at > ?)`,
  ).get(customerId, now) as { n: number };
  return Number(row.n);
}

/** Active = not archived, not superseded, not expired. */
export function listActiveMemories(
  db: DatabaseSync,
  customerId: string,
  now = Date.now(),
): MemoryRecord[] {
  return db.prepare(
    `SELECT * FROM memories
     WHERE customer_id = ? AND archived_at IS NULL AND superseded_by IS NULL
       AND (expires_at IS NULL OR expires_at > ?)
     ORDER BY updated_at DESC`,
  ).all(customerId, now).map(rowToMemory);
}

/** Everything, for the harness Memory view (audit surface). */
export function listAllMemories(db: DatabaseSync, customerId: string): MemoryRecord[] {
  return db.prepare(
    `SELECT * FROM memories WHERE customer_id = ? ORDER BY updated_at DESC`,
  ).all(customerId).map(rowToMemory);
}

/** Fenced on customer_id — one customer can never archive another's memory. */
export function archiveMemory(
  db: DatabaseSync,
  customerId: string,
  id: string,
  now = Date.now(),
): boolean {
  const result = db.prepare(
    `UPDATE memories SET archived_at = ?
     WHERE id = ? AND customer_id = ? AND archived_at IS NULL`,
  ).run(now, id, customerId);
  return Number(result.changes) > 0;
}

/** Erasure contract (spec §10.6): hard delete, archived rows included. */
export function eraseCustomerMemories(db: DatabaseSync, customerId: string): number {
  const result = db.prepare(`DELETE FROM memories WHERE customer_id = ?`).run(customerId);
  return Number(result.changes);
}

export function episodeExists(db: DatabaseSync, threadId: string): boolean {
  return db.prepare(
    `SELECT 1 FROM memories WHERE kind = 'episode' AND source_thread_id = ?`,
  ).get(threadId) !== undefined;
}

/** Customers that have any memories (for the Memory view picker). */
export function listMemoryCustomers(db: DatabaseSync): { customerId: string; count: number }[] {
  // deno-lint-ignore no-explicit-any
  return db.prepare(
    `SELECT customer_id, COUNT(*) AS n FROM memories GROUP BY customer_id ORDER BY customer_id`,
  ).all().map((row: any) => ({ customerId: row.customer_id, count: Number(row.n) }));
}

// ---------------------------------------------------------------------------
// Prompt rendering (read path, spec §10.4)

const KIND_ORDER: Record<MemoryKind, number> = { fact: 0, playbook: 1, episode: 2 };

function label(memory: MemoryRecord): string {
  const date = new Date(memory.updatedAt).toISOString().slice(0, 10);
  switch (memory.provenance) {
    case "customer_stated":
      return `[claimed by customer, ${date} — unverified]`;
    case "human_resolution":
      return `[playbook from human resolution, ${date}]`;
    case "ticket_summary":
      return `[past ticket${memory.sourceThreadId ? ` ${memory.sourceThreadId}` : ""}, ${date}]`;
    default:
      return `[noted, ${date}]`;
  }
}

export interface RenderedMemories {
  text: string;
  count: number;
  approxTokens: number;
  omitted: number;
}

/**
 * Facts and playbooks first, then recent episodes, until the token budget is
 * spent. Every entry carries provenance + date; claims read as claims.
 */
export function renderMemoriesForPrompt(
  memories: MemoryRecord[],
  budgetTokens: number,
): RenderedMemories {
  const ordered = [...memories].sort((a, b) =>
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.updatedAt - a.updatedAt
  );
  const lines: string[] = [];
  let approxTokens = 0;
  let omitted = 0;
  for (const memory of ordered) {
    const line = `- ${label(memory)} ${memory.content}`;
    const cost = Math.ceil(line.length / 4);
    if (approxTokens + cost > budgetTokens) {
      omitted++;
      continue;
    }
    lines.push(line);
    approxTokens += cost;
  }
  if (omitted > 0) lines.push(`- (+${omitted} older memories omitted)`);
  return { text: lines.join("\n"), count: lines.length - (omitted > 0 ? 1 : 0), approxTokens, omitted };
}

// ---------------------------------------------------------------------------
// Run-scoped access (built by the worker, consumed by harness + tools)

export interface MemoryAccess {
  readonly customerId: string;
  readonly hydrationBudgetTokens: number;
  listActive(): MemoryRecord[];
  /** In-run saves are always facts with provenance 'customer_stated' (spec §10.3/§10.5 — conservative: the run is customer-driven, so nothing the model writes may outrank a claim). */
  saveFact(content: string, supersedes?: string): MemoryRecord;
  archive(id: string): boolean;
  writesRemaining(): number;
}

export interface MemoryAccessOptions {
  customerId: string;
  threadId: string;
  hydrationBudgetTokens: number;
  runWriteCap: number;
  activeCap: number;
}

export function createMemoryAccess(db: DatabaseSync, options: MemoryAccessOptions): MemoryAccess {
  let writes = 0;
  return {
    customerId: options.customerId,
    hydrationBudgetTokens: options.hydrationBudgetTokens,
    listActive: () => listActiveMemories(db, options.customerId),
    saveFact: (content, supersedes) => {
      if (writes >= options.runWriteCap) {
        throw new Error(
          `Memory write cap reached for this run (${options.runWriteCap}) — consolidate what matters into fewer entries.`,
        );
      }
      const record = saveMemory(db, {
        customerId: options.customerId,
        kind: "fact",
        content,
        provenance: "customer_stated",
        sourceThreadId: options.threadId,
        supersedes,
        activeCap: options.activeCap,
      });
      writes++;
      logger.info("memory_saved", {
        threadId: options.threadId,
        customerId: options.customerId,
        memoryId: record.id,
        kind: record.kind,
        provenance: record.provenance,
        supersedes: supersedes ?? null,
      });
      return record;
    },
    archive: (id) => {
      const archived = archiveMemory(db, options.customerId, id);
      if (archived) {
        logger.info("memory_archived", {
          threadId: options.threadId,
          customerId: options.customerId,
          memoryId: id,
        });
      }
      return archived;
    },
    writesRemaining: () => Math.max(0, options.runWriteCap - writes),
  };
}
