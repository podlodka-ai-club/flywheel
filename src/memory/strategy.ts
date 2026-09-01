/**
 * Memory strategy seam (spec §10.8): the contract between the engine and a
 * memory implementation. The worker, the LLM harness, the tool assembler,
 * and the dev harness depend ONLY on these interfaces. Implementations live
 * in ./strategies/<name>/ and are selected by name through ./registry.ts —
 * `MEMORY_STRATEGY` in the environment, or `--memory=<name>` on an engine
 * start (`deno task start --memory=<name>`).
 *
 * Every strategy inherits the spec §10 invariants: all state keyed by the
 * verified customer_id (unverified tickets never get a run handle — the
 * worker enforces that, not the strategy), tools that take NO customer id
 * parameter, provenance assigned by engine code rather than by the model,
 * and erasure as a hard delete of everything held about one customer.
 */
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { DatabaseSync } from "node:sqlite";
import type { LlmSetup } from "../agent/harness.ts";
import type { Config } from "../config.ts";
import type { MessageRecord } from "../db/messages.ts";

/** Identity of one agent run: the verified customer and the ticket. */
export interface MemoryRunInput {
  customerId: string;
  threadId: string;
}

/** What the run is about — lets retrieval-style strategies rank by relevance. */
export interface MemoryHydrationContext {
  /** The claimed anchor customer message. */
  message: MessageRecord;
  /** Coalesced follow-ups (spec §4.3), oldest first. */
  followUps: MessageRecord[];
  /** Completed prior turns of the thread, oldest first. */
  history: MessageRecord[];
}

export interface MemoryHydration {
  /**
   * Prompt section for "What you remember about this customer" — already
   * provenance-labelled so claims read as claims (spec §10.4/§10.5); null
   * when there is nothing to say.
   */
  section: string | null;
  /** Strategy-specific telemetry, spread onto the `memory_hydrated` log event. */
  stats: Record<string, unknown>;
}

/**
 * Run-scoped, customer-fenced handle. Opened by the worker for verified
 * customers only and consumed by the harness (read path) and the tool
 * assembler (write path). A strategy may keep per-run state here (write caps).
 */
export interface MemoryRun {
  readonly customerId: string;
  /** Read path: what the agent should know before answering. */
  hydrate(context: MemoryHydrationContext, signal?: AbortSignal): Promise<MemoryHydration>;
  /**
   * The strategy's tools for this run, closed over the verified identity —
   * NO tool may take a customer id parameter (spec §6.1 security model).
   */
  tools(): AgentTool[];
  /**
   * Usage guidance for those tools, one `- name — when to use it` line per
   * tool, rendered into the system prompt's tool list. Empty = no tools.
   */
  toolGuidance(): string;
}

/**
 * One row of the audit surface (dev harness Memory view). Strategies map
 * their own records onto this shape; fields a strategy has no notion of are
 * null — the view derives status from expiresAt / supersededBy / archivedAt.
 */
export interface MemoryEntry {
  id: string;
  customerId: string;
  kind: string;
  content: string;
  provenance: string;
  sourceThreadId: string | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  supersededBy: string | null;
  archivedAt: number | null;
}

export interface MemoryCustomerSummary {
  customerId: string;
  count: number;
}

/** Operator-facing operations: audit, soft-forget, and the erasure contract. */
export interface MemoryAudit {
  /** Customers that have any memory at all (Memory view picker). */
  listCustomers(): MemoryCustomerSummary[];
  /** Everything held about one customer, inactive entries included. */
  listEntries(customerId: string): MemoryEntry[];
  /** Soft-forget one entry; fenced on customerId — false when it isn't theirs. */
  archive(customerId: string, id: string): boolean;
  /** Erasure contract (spec §10.6): hard delete of everything about the customer; returns rows removed. */
  erase(customerId: string): number;
}

export interface MemoryJob {
  stop(): Promise<void>;
}

export interface MemoryStrategy {
  /** Registry name — what MEMORY_STRATEGY / --memory select. */
  readonly name: string;
  /** Per-run handle; the worker calls this only for verified customers (spec §10.1). */
  openRun(input: MemoryRunInput): MemoryRun;
  /**
   * Background work (end-of-ticket summarization, consolidation, …); null
   * when the strategy has none. Called once by the engine, never by the
   * dev harness.
   */
  startJobs(): MemoryJob | null;
  /** Audit surface, shared with the dev harness process. */
  readonly audit: MemoryAudit;
  /** Resolved settings for the `engine_started` log line. */
  describe(): Record<string, unknown>;
}

export interface MemoryStrategyDeps {
  db: DatabaseSync;
  config: Config;
  /**
   * The agent's resolved LLM setup when running AGENT_MODE=llm. Undefined in
   * echo mode and in the dev harness — a strategy must then stay deterministic
   * and key-free (no provider calls, no API-key env probing).
   */
  llm?: LlmSetup;
}

export type MemoryStrategyFactory = (deps: MemoryStrategyDeps) => MemoryStrategy;
