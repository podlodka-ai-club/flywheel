import type { MessageRecord } from "../db/messages.ts";

export interface AgentReply {
  content: string;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: number | null;
  /** Structured flags for the dispatcher, e.g. escalation (spec §3.2 / §6.1). */
  metadata?: Record<string, unknown> | null;
}

export interface AgentRunInput {
  threadId: string;
  /**
   * Verified customer/account identity from the external platform, propagated
   * from the anchor row. Scopes tool lookups (spec §6.1) and, in future
   * phases, per-customer memory — never trust IDs found in message text.
   */
  customerId: string | null;
  /** The claimed anchor customer message. */
  message: MessageRecord;
  /** Completed prior turns of the thread, oldest first (spec §5.1 hydration). */
  history: MessageRecord[];
  /**
   * Coalesced follow-up customer messages that arrived while a reply was
   * being generated (spec §4.3), oldest first. The reply must address the
   * anchor AND all follow-ups as one consolidated response.
   */
  followUps?: MessageRecord[];
  signal?: AbortSignal;
}

export interface AgentHarness {
  readonly mode: string;
  run(input: AgentRunInput): Promise<AgentReply>;
}

export interface HarnessOptions {
  /** Honor [[sleep:ms]] / [[fail]] markers (echo mode only, DEV_FAULTS=1). */
  devFaults?: boolean;
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(() => resolve(), ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

/**
 * Deterministic agent for engine testing without an LLM key: replies
 * `ECHO: <anchor>` — or `ECHO: <anchor> | <followUp> | …` when follow-ups
 * were coalesced. With devFaults on: `[[sleep:ms]]` delays the run (re-applied
 * on every regeneration and retry), `[[sleep_once:ms]]` delays only the first
 * attempt, `[[fail]]` throws.
 */
class EchoHarness implements AgentHarness {
  readonly mode = "echo";

  constructor(private readonly devFaults: boolean) {}

  async run(input: AgentRunInput): Promise<AgentReply> {
    const texts = [input.message.content, ...(input.followUps ?? []).map((m) => m.content)];
    if (this.devFaults) {
      const joined = texts.join("\n");
      // [[sleep_once:ms]] delays only the first attempt — retries run instantly,
      // which is what crash-recovery and lost-lease demos need (a plain
      // [[sleep]] longer than the lease would starve into 'failed').
      const sleepOnceMatch = joined.match(/\[\[sleep_once:(\d{1,6})\]\]/);
      if (sleepOnceMatch && input.message.attemptCount <= 1) {
        await abortableSleep(Math.min(Number(sleepOnceMatch[1]), 120_000), input.signal);
      }
      const sleepMatch = joined.match(/\[\[sleep:(\d{1,6})\]\]/);
      if (sleepMatch) {
        await abortableSleep(Math.min(Number(sleepMatch[1]), 120_000), input.signal);
      }
      if (joined.includes("[[fail]]")) {
        throw new Error("DEV_FAULTS: [[fail]] marker triggered");
      }
    }
    return {
      content: `ECHO: ${texts.join(" | ")}`,
      model: "echo",
      tokensIn: null,
      tokensOut: null,
      costUsd: null,
    };
  }
}

export function createHarness(mode: string, options: HarnessOptions = {}): AgentHarness {
  if (mode === "echo") return new EchoHarness(options.devFaults ?? false);
  if (mode === "llm") {
    throw new Error("AGENT_MODE=llm arrives in Milestone 4 — run with AGENT_MODE=echo until then");
  }
  throw new Error(`Unknown AGENT_MODE "${mode}"`);
}
