/**
 * The `structured` memory strategy — the spec §10 (M7) design behind the
 * strategy seam: typed `fact` / `episode` / `playbook` rows in the `memories`
 * table with system-assigned provenance and supersede/archive chains
 * (store.ts), hydration by kind priority + recency under a token budget,
 * the `save_memory` / `archive_memory` tools (tools/), and the end-of-ticket
 * summarizer background job (summarizer.ts; LLM-backed via summarize_llm.ts,
 * deterministic echo without an LLM setup).
 */
import type { DatabaseSync } from "node:sqlite";
import { type LlmSetup, resolveLlmSetup } from "../../../agent/harness.ts";
import type { Config } from "../../../config.ts";
import type { MemoryJob, MemoryRun, MemoryRunInput, MemoryStrategy } from "../../strategy.ts";
import {
  archiveMemory,
  createMemoryAccess,
  eraseCustomerMemories,
  listAllMemories,
  listMemoryCustomers,
  renderMemoriesForPrompt,
} from "./store.ts";
import { createLlmThreadSummarizer } from "./summarize_llm.ts";
import { createEchoThreadSummarizer, startSummarizer } from "./summarizer.ts";
import { buildArchiveMemory } from "./tools/archive_memory.ts";
import { buildSaveMemory } from "./tools/save_memory.ts";

export const STRUCTURED_MEMORY_STRATEGY = "structured";

/** The slice of Config this strategy reads. */
export type StructuredMemoryConfig = Pick<
  Config,
  | "llmProvider"
  | "summarizerProvider"
  | "summarizerModel"
  | "summarizeAfterMs"
  | "memoryHydrationBudget"
  | "memoryRunWriteCap"
  | "memoryActiveCap"
>;

export interface StructuredMemoryDeps {
  db: DatabaseSync;
  config: StructuredMemoryConfig;
  /** The agent's LLM setup; undefined (echo mode, dev harness) = deterministic echo summarizer. */
  llm?: LlmSetup;
}

/** Rendered into the system prompt's "Using your tools" list (spec §10.3 write path 1). */
const TOOL_GUIDANCE =
  `- save_memory — record ONE durable fact about this customer worth knowing on FUTURE tickets (environment constraints, maintenance windows, preferences, contacts, long-running projects). Never save transient details, secrets, or unverified entitlement/billing claims. When the customer corrects an earlier fact, save the corrected version with "supersedes".
- archive_memory — retire a remembered fact that is wrong or withdrawn.`;

/**
 * The summarizer may run a different (typically cheaper) provider/model than
 * the main agent: SUMMARIZER_PROVIDER / SUMMARIZER_MODEL, empty = inherit the
 * agent's setup. Without an agent LLM setup there is no LLM summarizer at all
 * — and no API-key env probing, which the dev harness's permissions forbid.
 */
export function resolveSummarizerSetup(
  config: StructuredMemoryConfig,
  agentLlm: LlmSetup | undefined,
): LlmSetup | undefined {
  if (agentLlm === undefined) return undefined;
  if (config.summarizerProvider === "" && config.summarizerModel === "") return agentLlm;
  return resolveLlmSetup({
    llmProvider: config.summarizerProvider === "" ? config.llmProvider : config.summarizerProvider,
    llmModel: config.summarizerModel,
    llmThinking: "off",
  });
}

export function createStructuredMemoryStrategy(deps: StructuredMemoryDeps): MemoryStrategy {
  const { db, config } = deps;
  const summarizerSetup = resolveSummarizerSetup(config, deps.llm);

  return {
    name: STRUCTURED_MEMORY_STRATEGY,

    openRun(input: MemoryRunInput): MemoryRun {
      const access = createMemoryAccess(db, {
        customerId: input.customerId,
        threadId: input.threadId,
        hydrationBudgetTokens: config.memoryHydrationBudget,
        runWriteCap: config.memoryRunWriteCap,
        activeCap: config.memoryActiveCap,
      });
      return {
        customerId: input.customerId,
        // Read path (spec §10.4): active memories, facts + playbooks first,
        // then recent episodes, until the token budget is spent. Ranking v1
        // is kind priority + recency — the run's messages are not consulted.
        hydrate: () => {
          const rendered = renderMemoriesForPrompt(access.listActive(), access.hydrationBudgetTokens);
          return Promise.resolve({
            section: rendered.text === "" ? null : rendered.text,
            stats: {
              count: rendered.count,
              approxTokens: rendered.approxTokens,
              omitted: rendered.omitted,
            },
          });
        },
        tools: () => [buildSaveMemory(access), buildArchiveMemory(access)],
        toolGuidance: () => TOOL_GUIDANCE,
      };
    },

    startJobs(): MemoryJob {
      return startSummarizer(db, {
        summarizeAfterMs: config.summarizeAfterMs,
        activeCap: config.memoryActiveCap,
        summarize: summarizerSetup !== undefined
          ? createLlmThreadSummarizer(summarizerSetup)
          : createEchoThreadSummarizer(),
      });
    },

    audit: {
      listCustomers: () => listMemoryCustomers(db),
      listEntries: (customerId) => listAllMemories(db, customerId),
      archive: (customerId, id) => archiveMemory(db, customerId, id),
      erase: (customerId) => eraseCustomerMemories(db, customerId),
    },

    describe: () => ({
      summarizeAfterMs: config.summarizeAfterMs,
      summarizerProvider: summarizerSetup?.provider ?? null,
      summarizerModel: summarizerSetup?.modelId ?? null,
      memoryHydrationBudget: config.memoryHydrationBudget,
      memoryRunWriteCap: config.memoryRunWriteCap,
      memoryActiveCap: config.memoryActiveCap,
    }),
  };
}
