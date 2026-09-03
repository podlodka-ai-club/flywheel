/**
 * Support tools (spec §6). Built fresh per agent run, closed over the run's
 * verified identity — customer-scoped tools take NO id argument from the
 * model, so prompt-injected "look up account X" has nothing to grab.
 *
 * One file per core tool. The real LLM receives only implemented runtime
 * capabilities (local knowledge-base search, escalation, plus the active
 * memory strategy's tools). Fixture-backed CRM/deployment lookups are assembled
 * separately for tests so fake customer data cannot consume real model rounds
 * or influence customer replies.
 */
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { logger } from "../../logger/index.ts";
import type { ToolRunContext } from "./context.ts";
import { buildSearchKnowledgeBase } from "./search_knowledge_base.ts";
import { buildLookupCustomerAccount } from "./lookup_customer_account.ts";
import { buildLookupCustomerSetup } from "./lookup_customer_setup.ts";
import { buildEscalateToHuman } from "./escalate_to_human.ts";

export type { EscalationState, ToolRunContext } from "./context.ts";

/** Wrap execute with spec §7 tool_executed logging. */
function instrument(context: ToolRunContext, tool: AgentTool): AgentTool {
  const execute = tool.execute;
  return {
    ...tool,
    execute: async (toolCallId, params, signal, onUpdate) => {
      const startedAt = Date.now();
      try {
        const result = await execute(toolCallId, params, signal, onUpdate);
        logger.info("tool_executed", {
          threadId: context.threadId,
          customerId: context.customerId,
          toolName: tool.name,
          args: params,
          resultCount:
            typeof (result.details as { resultCount?: unknown } | undefined)
                ?.resultCount === "number"
              ? (result.details as { resultCount: number }).resultCount
              : undefined,
          durationMs: Date.now() - startedAt,
        });
        return result;
      } catch (err) {
        logger.warn("tool_failed", {
          threadId: context.threadId,
          customerId: context.customerId,
          toolName: tool.name,
          args: params,
          durationMs: Date.now() - startedAt,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
  };
}

function instrumentAll(
  context: ToolRunContext,
  tools: AgentTool[],
): AgentTool[] {
  return tools.map((tool) => instrument(context, tool));
}

/** Tools safe to expose to the real LLM runtime. */
export function buildSupportTools(context: ToolRunContext): AgentTool[] {
  return instrumentAll(context, [
    buildSearchKnowledgeBase(context),
    buildEscalateToHuman(context),
    // Memory tools come from the strategy's run handle, which the worker opens
    // only for verified customers with memory enabled — no verified identity,
    // no memory reads or writes (spec §10.1). The seam requires them to be
    // id-free, like every other customer-scoped tool.
    ...(context.memory?.tools() ?? []),
  ]);
}

/**
 * Complete tool set, including fixture-backed CRM/deployment lookups, for
 * isolated connector/tool tests. Never pass this set to a real provider run.
 */
export function buildFixtureBackedSupportTools(
  context: ToolRunContext,
): AgentTool[] {
  return instrumentAll(context, [
    buildSearchKnowledgeBase(context),
    buildLookupCustomerAccount(context),
    buildLookupCustomerSetup(context),
    buildEscalateToHuman(context),
    ...(context.memory?.tools() ?? []),
  ]);
}
