/**
 * Agent harnesses — the seam between the queue engine and reply generation.
 * Defines the AgentHarness contract (AgentRunInput → AgentReply) and both
 * implementations: EchoHarness (deterministic key-free testing, optional
 * fault markers) and LlmHarness (the real pi-agent-core loop with system
 * prompt, hydrated history, support tools, per-customer memory, and
 * escalation metadata on replies). Also resolves/validates the LLM provider
 * setup at startup and owns thinking-level clamping plus the runtime
 * "reasoning is mandatory" bump shared with the summarizer.
 */
import { Agent } from "@earendil-works/pi-agent-core";
import type { StreamFn, ThinkingLevel } from "@earendil-works/pi-agent-core";
import { clampThinkingLevel, getSupportedThinkingLevels } from "@earendil-works/pi-ai";
import type { Api, AssistantMessage, Model, Models } from "@earendil-works/pi-ai";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";
import { logger } from "../logger/index.ts";
import type { MessageRecord } from "../db/messages.ts";
import { createConnectors } from "../connectors/index.ts";
import type { Connectors } from "../connectors/types.ts";
import type { MemoryAccess } from "../memory/store.ts";
import { renderMemoriesForPrompt } from "../memory/store.ts";
import { buildPromptMessages, hydrateThreadHistory } from "./hydrator.ts";
import { buildSystemPrompt } from "./prompt.ts";
import { buildSupportTools, type ToolRunContext } from "./tools/index.ts";

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
  /**
   * Per-customer memory access (spec §10), built by the worker only for
   * verified customers with memory enabled. Absent = no reads, no writes,
   * no memory tools.
   */
  memory?: MemoryAccess;
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

function humanContinuationMetadata(message: MessageRecord): Record<string, unknown> | null {
  if (
    message.role !== "system" ||
    (message.metadata as { type?: string } | null)?.type !== "human_escalation_response"
  ) return null;
  return {
    human_assisted: true,
    continued_from_escalation: message.inReplyTo,
    continued_escalation_reference: message.metadata?.escalation_reference ?? null,
  };
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
      metadata: humanContinuationMetadata(input.message),
    };
  }
}

/**
 * Provider rejections meaning "this endpoint requires a reasoning level",
 * e.g. OpenRouter's "Reasoning is mandatory for this endpoint and cannot be
 * disabled". The catalog metadata clampThinkingLevel relies on can lag the
 * live endpoint, so runtime bumping is the backstop (harness + summarizer).
 */
export const REASONING_REQUIRED_ERROR =
  /\breasoning\b.*?\b(mandatory|required|cannot be disabled|must be enabled)/is;

/** Lowest supported reasoning level strictly above `current` for this model. */
export function nextSupportedThinkingLevel(
  model: Model<Api>,
  current: ThinkingLevel,
): ThinkingLevel | null {
  const order: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
  const supported = getSupportedThinkingLevels(model);
  for (const level of order.slice(order.indexOf(current) + 1)) {
    if (supported.includes(level)) return level;
  }
  return null;
}

/** Per-provider default models (overridable via LLM_MODEL). */
export const DEFAULT_LLM_MODELS: Record<string, string> = {
  openrouter: "openai/gpt-4o-mini",
  google: "gemini-3.6-flash",
};

/** Conventional API-key env var per provider (pi-ai's own conventions). */
export const PROVIDER_KEY_ENVS: Record<string, string> = {
  openrouter: "OPENROUTER_API_KEY",
  google: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

export interface LlmSetup {
  provider: string;
  modelId: string;
  apiKey: string;
  /**
   * Requested reasoning level (LLM_THINKING, default "off"). The harness
   * clamps it to what the model actually supports: reasoning-mandatory
   * models raise "off" to their minimum, non-reasoning models force "off".
   */
  thinkingLevel?: ThinkingLevel;
}

/**
 * Resolve and validate the LLM configuration, failing fast with actionable
 * errors at startup rather than at first message.
 */
export function resolveLlmSetup(
  input: { llmProvider: string; llmModel: string; llmThinking?: ThinkingLevel },
): LlmSetup {
  const provider = input.llmProvider;
  const modelId = input.llmModel !== "" ? input.llmModel : DEFAULT_LLM_MODELS[provider];
  if (modelId === undefined) {
    throw new Error(
      `LLM_PROVIDER "${provider}" has no default model — set LLM_MODEL explicitly ` +
        `(supported out of the box: ${Object.keys(DEFAULT_LLM_MODELS).join(", ")})`,
    );
  }
  const keyEnv = PROVIDER_KEY_ENVS[provider] ??
    `${provider.toUpperCase().replaceAll("-", "_")}_API_KEY`;
  const apiKey = Deno.env.get(keyEnv) ?? "";
  if (apiKey === "") {
    throw new Error(
      `AGENT_MODE=llm needs an API key: set ${keyEnv} in your environment or in a .env file ` +
        `(the start task loads .env automatically). Alternatives: switch provider via LLM_PROVIDER ` +
        `(${Object.keys(DEFAULT_LLM_MODELS).join(", ")}), or run without an LLM via AGENT_MODE=echo.`,
    );
  }
  return { provider, modelId, apiKey, thinkingLevel: input.llmThinking ?? "off" };
}

export interface LlmHarnessOptions extends LlmSetup {
  /** Injectable for tests: model catalog and/or a canned stream function. */
  models?: Models;
  model?: Model<Api>;
  streamFn?: StreamFn;
  /** External-system clients; defaults to the fixture-backed mocks. */
  connectors?: Connectors;
}

/**
 * The real agent (spec §5): pi-agent-core loop over pi-ai's provider gateway.
 * Each run builds a fresh Agent seeded with the thread's completed history,
 * prompts it with the anchor (+ any coalesced follow-ups) as user turns, and
 * maps the final assistant message to an AgentReply with usage telemetry.
 */
class LlmHarness implements AgentHarness {
  readonly mode = "llm";
  private readonly models: Models;
  private readonly model: Model<Api>;
  private readonly streamFn: StreamFn;
  private readonly connectors: Connectors;
  /** Mutable: bumped and memoized when the provider rejects the level. */
  private thinkingLevel: ThinkingLevel;


  constructor(private readonly options: LlmHarnessOptions) {
    this.models = options.models ?? builtinModels();
    const model = options.model ?? this.models.getModel(options.provider, options.modelId);
    if (model === undefined) {
      const sample = this.models.getModels(options.provider).slice(0, 5).map((m) => m.id);
      throw new Error(
        `Model "${options.modelId}" not found for provider "${options.provider}". ` +
          (sample.length > 0
            ? `Examples of valid LLM_MODEL values: ${sample.join(", ")}`
            : `Unknown provider — supported examples: ${Object.keys(DEFAULT_LLM_MODELS).join(", ")}`),
      );
    }
    this.model = model;
    const requested = options.thinkingLevel ?? "off";
    this.thinkingLevel = clampThinkingLevel(model, requested);
    if (this.thinkingLevel !== requested) {
      logger.info("thinking_level_clamped", {
        provider: options.provider,
        modelId: options.modelId,
        requested,
        effective: this.thinkingLevel,
      });
    }
    this.streamFn = options.streamFn ??
      ((m, context, streamOptions) => this.models.streamSimple(m, context, streamOptions));
    this.connectors = options.connectors ?? createConnectors();
  }

  async run(input: AgentRunInput): Promise<AgentReply> {
    // Bounded by the number of thinking levels: on a "reasoning is mandatory"
    // rejection, bump one level, memoize, and retry the run.
    for (;;) {
      const result = await this.runOnce(input);
      if (result.ok) return result.reply;
      const bumpable = REASONING_REQUIRED_ERROR.test(result.error)
        ? nextSupportedThinkingLevel(this.model, this.thinkingLevel)
        : null;
      if (bumpable === null) throw new Error(result.error);
      logger.warn("thinking_level_bumped", {
        provider: this.options.provider,
        modelId: this.options.modelId,
        from: this.thinkingLevel,
        to: bumpable,
        providerError: result.error.slice(0, 200),
      });
      this.thinkingLevel = bumpable;
    }
  }

  private async runOnce(
    input: AgentRunInput,
  ): Promise<{ ok: true; reply: AgentReply } | { ok: false; error: string }> {
    const toolContext: ToolRunContext = {
      threadId: input.threadId,
      messageId: input.message.id,
      customerId: input.customerId,
      connectors: this.connectors,
      escalation: { escalated: false },
      memory: input.memory,
    };
    let memorySection: string | undefined;
    if (input.memory !== undefined) {
      const rendered = renderMemoriesForPrompt(
        input.memory.listActive(),
        input.memory.hydrationBudgetTokens,
      );
      memorySection = rendered.text === "" ? undefined : rendered.text;
      logger.info("memory_hydrated", {
        threadId: input.threadId,
        customerId: input.customerId,
        count: rendered.count,
        approxTokens: rendered.approxTokens,
        omitted: rendered.omitted,
      });
    }
    const agent = new Agent({
      initialState: {
        systemPrompt: buildSystemPrompt({
          threadId: input.threadId,
          customerId: input.customerId,
          memorySection,
          memoryToolsEnabled: input.memory !== undefined,
        }),
        model: this.model,
        thinkingLevel: this.thinkingLevel,
        tools: buildSupportTools(toolContext),
        messages: hydrateThreadHistory(input.history),
      },
      streamFn: this.streamFn,
      getApiKey: () => this.options.apiKey,
      maxRetryDelayMs: 10_000,
    });
    const stopOnAbort = () => agent.abort();
    input.signal?.addEventListener("abort", stopOnAbort, { once: true });
    try {
      await agent.prompt(buildPromptMessages(input.message, input.followUps ?? []));
    } finally {
      input.signal?.removeEventListener("abort", stopOnAbort);
    }

    const reply = [...agent.state.messages].reverse()
      .find((m): m is AssistantMessage => m.role === "assistant");
    if (reply === undefined) {
      return { ok: false, error: agent.state.errorMessage ?? "agent produced no assistant reply" };
    }
    if (reply.stopReason === "error" || reply.stopReason === "aborted") {
      return {
        ok: false,
        error: reply.errorMessage ?? `LLM run ended with stopReason=${reply.stopReason}`,
      };
    }
    const text = reply.content
      .filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (text === "") {
      return { ok: false, error: "agent reply contained no text content" };
    }
    const metadata: Record<string, unknown> = humanContinuationMetadata(input.message) ?? {};
    if (toolContext.escalation.escalated) {
      Object.assign(metadata, {
        escalated: true,
        escalation_reason: toolContext.escalation.reason ?? "unspecified",
        escalation_request: toolContext.escalation.request ?? "Review the case and advise how to continue.",
        escalation_reference: toolContext.escalation.externalReference ?? null,
      });
    }
    return {
      ok: true,
      reply: {
        content: text,
        model: `${this.options.provider}:${reply.model || this.options.modelId}`,
        tokensIn: reply.usage.input,
        tokensOut: reply.usage.output,
        costUsd: reply.usage.cost.total,
        // Escalation + human-continuation flags are dispatcher-facing; reply
        // content remains customer-safe.
        metadata: Object.keys(metadata).length === 0 ? null : metadata,
      },
    };
  }
}

export function createLlmHarness(options: LlmHarnessOptions): AgentHarness {
  return new LlmHarness(options);
}

export function createHarness(
  mode: string,
  options: HarnessOptions & { llm?: LlmSetup } = {},
): AgentHarness {
  if (mode === "echo") return new EchoHarness(options.devFaults ?? false);
  if (mode === "llm") {
    if (options.llm === undefined) {
      throw new Error("createHarness('llm') requires the resolved LLM setup");
    }
    return createLlmHarness(options.llm);
  }
  throw new Error(`Unknown AGENT_MODE "${mode}"`);
}
