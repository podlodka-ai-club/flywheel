/**
 * Memory strategy seam (spec §10.8): the contract between the engine and a
 * memory implementation. The worker, the LLM harness, the tool assembler,
 * the memory runtime, and the dev harness depend ONLY on these interfaces.
 * Implementations live in ./strategies/<name>/ and are selected by name
 * through ./registry.ts — `MEMORY_STRATEGY` in the environment, or
 * `--memory=<name>` on an engine start (`deno task start --memory=<name>`).
 *
 * A strategy does its work at three moments, through three ports:
 *
 *   - Run port (`openRun`): synchronous with the reply — what the agent must
 *     know before answering, and the tools it may call mid-run.
 *   - Event port (`events`): after the fact — rows landing on the messages
 *     bus (a customer message, a committed reply, a platform note such as a
 *     ticket being closed), delivered in order by the engine's runtime.
 *   - Schedule port (`jobs`): time-based work (idle sweeps, decay,
 *     consolidation) declared as loops the engine runs for the strategy.
 *
 * The engine owns all scheduling (./runtime.ts): a strategy declares what it
 * reacts to and how often it runs, and never writes a poll loop or a timer.
 * Every strategy inherits the spec §10 invariants: all state keyed by the
 * verified customer_id (unverified tickets never get a run handle or an
 * event — the worker and the runtime enforce that, not the strategy), tools
 * that take NO customer id parameter, provenance assigned by engine code
 * rather than by the model, and erasure as a hard delete of everything held
 * about one customer.
 */
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { DatabaseSync } from "node:sqlite";
import type { LlmSetup } from "../agent/harness.ts";
import type { Config } from "../config.ts";
import type { MessageRecord } from "../db/messages.ts";

// ---------------------------------------------------------------------------
// Run port — synchronous with the reply

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
 * Everything here runs before the reply and can delay it — keep hydrate fast.
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

// ---------------------------------------------------------------------------
// Event port — after the fact

/**
 * What a row landing on the messages bus means. The runtime classifies every
 * insert: customer rows, assistant rows (a run's reply — visible only once
 * its fenced completion committed), and platform-inserted system rows by
 * their metadata.type (spec §3.2 items 4–5); any other system row is a
 * `system_note`. Status transitions are not events: the reply's commit is
 * observable as the assistant row itself.
 */
export type MemoryEventType =
  | "customer_message"
  | "agent_reply"
  | "human_resolution"
  | "ticket_closed"
  | "system_note";

export interface MemoryEvent {
  type: MemoryEventType;
  /** Verified identity from the row — rows without one never become events. */
  customerId: string;
  threadId: string;
  /** The row that produced the event. */
  message: MessageRecord;
  /**
   * Position on the bus (monotonic per database): ordering, logging, and an
   * idempotency key for handlers that keep their own bookkeeping.
   */
  sequence: number;
  /** The thread as of this event — rows up to and including this one, oldest first. Loaded lazily. */
  thread(): MessageRecord[];
}

/**
 * Delivery contract (spec §10.8): events arrive in bus order, always after
 * the producing transaction committed, at least once — a handler must be
 * idempotent, exactly as workers must be. A handler that throws is retried a
 * few times, then the event is dropped with a `memory_event_dropped` log so
 * one poison row never blocks the stream; a periodic job is the fallback
 * for anything that must not be missed.
 */
export interface MemoryEventHandler {
  /** The runtime calls handle() only for these types. */
  types: MemoryEventType[];
  handle(event: MemoryEvent, signal?: AbortSignal): Promise<void>;
}

// ---------------------------------------------------------------------------
// Schedule port — time-based

/** A loop the engine runs for the strategy: run(), sleep intervalMs, repeat until shutdown. */
export interface MemoryJobSpec {
  name: string;
  intervalMs: number;
  /** One iteration; errors are logged (`memory_job_failed`) and the loop continues. */
  run(signal: AbortSignal): Promise<void>;
}

// ---------------------------------------------------------------------------
// Operator surface

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

// ---------------------------------------------------------------------------
// The strategy

export interface MemoryStrategy {
  /** Registry name — what MEMORY_STRATEGY / --memory select. */
  readonly name: string;
  /** Run port; the worker calls this only for verified customers (spec §10.1). */
  openRun(input: MemoryRunInput): MemoryRun;
  /** Event port; absent = the strategy reacts to nothing after the fact. */
  readonly events?: MemoryEventHandler;
  /** Schedule port; absent or empty = no time-based work. */
  readonly jobs?: MemoryJobSpec[];
  /** Audit surface, shared with the dev harness process. */
  readonly audit: MemoryAudit;
  /** Resolved settings for the `engine_started` log line. */
  describe(): Record<string, unknown>;
  /** Release external resources (vector clients, files) on engine shutdown. */
  close?(): Promise<void>;
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
