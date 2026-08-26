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
  /** The claimed anchor customer message. */
  message: MessageRecord;
  /** Completed prior turns of the thread, oldest first (spec §5.1 hydration). */
  history: MessageRecord[];
  signal?: AbortSignal;
}

export interface AgentHarness {
  readonly mode: string;
  run(input: AgentRunInput): Promise<AgentReply>;
}

/**
 * Deterministic agent for engine testing without an LLM key: replies
 * `ECHO: <content>`. Milestone 3 adds opt-in fault markers to this mode.
 */
class EchoHarness implements AgentHarness {
  readonly mode = "echo";

  run(input: AgentRunInput): Promise<AgentReply> {
    return Promise.resolve({
      content: `ECHO: ${input.message.content}`,
      model: "echo",
      tokensIn: null,
      tokensOut: null,
      costUsd: null,
    });
  }
}

export function createHarness(mode: string): AgentHarness {
  if (mode === "echo") return new EchoHarness();
  if (mode === "llm") {
    throw new Error("AGENT_MODE=llm arrives in Milestone 4 — run with AGENT_MODE=echo until then");
  }
  throw new Error(`Unknown AGENT_MODE "${mode}"`);
}
