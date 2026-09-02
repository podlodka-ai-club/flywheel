/**
 * Support tools (spec §6). Built fresh per agent run, closed over the run's
 * verified identity — customer-scoped tools take NO id argument from the
 * model, so prompt-injected "look up account X" has nothing to grab.
 *
 * One file per tool; this module assembles the set for a run and wraps every
 * tool with tool_executed/tool_failed logging. Shared context lives in context.ts.
 */
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { logger } from "../../logger/index.ts";
import type { ToolRunContext } from "./context.ts";
import { buildSearchKnowledgeBase } from "./search_knowledge_base.ts";
import { buildLookupCustomerAccount } from "./lookup_customer_account.ts";
import { buildLookupCustomerSetup } from "./lookup_customer_setup.ts";
import { buildEscalateToHuman } from "./escalate_to_human.ts";
import { buildSaveMemory } from "./save_memory.ts";
import { buildArchiveMemory } from "./archive_memory.ts";

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
          resultCount: typeof (result.details as { resultCount?: unknown } | undefined)?.resultCount === "number"
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

export function buildSupportTools(context: ToolRunContext): AgentTool[] {
  const tools = [
    buildSearchKnowledgeBase(context),
    buildLookupCustomerAccount(context),
    buildLookupCustomerSetup(context),
    buildEscalateToHuman(context),
  ];

  // Memory tools exist only for verified customers with memory enabled —
  // no verified identity, no memory reads or writes (spec §10.1).
  const memory = context.memory;
  if (memory !== undefined) {
    tools.push(buildSaveMemory(memory), buildArchiveMemory(memory));
  }

  return tools.map((tool) => instrument(context, tool));
}
