/**
 * Support tools (spec §6). Built fresh per agent run, closed over the run's
 * verified identity — customer-scoped tools take NO id argument from the
 * model, so prompt-injected "look up account X" has nothing to grab.
 */
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { logger } from "../../logger/index.ts";
import type { Connectors } from "../../connectors/types.ts";

export interface EscalationState {
  escalated: boolean;
  reason?: string;
  /** Ticketing platform's reference from the escalation call. */
  externalReference?: string;
}

export interface ToolRunContext {
  threadId: string;
  /** Verified identity from the external platform (spec §3.2) — never from message text. */
  customerId: string | null;
  connectors: Connectors;
  /** Written by escalate_to_human; the harness copies it onto reply metadata. */
  escalation: EscalationState;
}

function textResult(text: string, details: unknown = {}): AgentToolResult<unknown> {
  return { content: [{ type: "text", text }], details };
}

function requireCustomer(context: ToolRunContext, toolName: string): string {
  if (context.customerId === null) {
    throw new Error(
      `${toolName} unavailable: this ticket has no verified customer identity attached by the support platform.`,
    );
  }
  return context.customerId;
}

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
  const searchKnowledgeBase: AgentTool = {
    name: "search_knowledge_base",
    label: "Search documentation",
    description:
      "Search the product documentation base (help articles, how-tos, policies, upgrade guides). " +
      "Use for any question about product capabilities, configuration, limits, or procedures.",
    parameters: Type.Object({
      query: Type.String({ description: "Search terms, e.g. 'csv export' or 'api rate limit'" }),
      limit: Type.Optional(
        Type.Number({ description: "Max articles to return (default 3)", minimum: 1, maximum: 5 }),
      ),
    }),
    execute: async (_id, rawParams, signal) => {
      const params = rawParams as { query: string; limit?: number };
      const results = await context.connectors.knowledgeBase.search(
        params.query,
        params.limit ?? 3,
        signal,
      );
      if (results.length === 0) {
        return textResult(
          `No documentation articles matched "${params.query}". Do not guess — say the documentation does not cover it or escalate.`,
          { resultCount: 0 },
        );
      }
      const text = results
        .map(({ article }) => `# ${article.title} [${article.id}]\n${article.body}`)
        .join("\n\n");
      return textResult(text, { resultCount: results.length, ids: results.map((r) => r.article.id) });
    },
  };

  const lookupCustomerAccount: AgentTool = {
    name: "lookup_customer_account",
    label: "Look up customer account",
    description:
      "Fetch the verified customer's CRM record: company, plan, seats, account manager, contract. " +
      "Always bound to the ticket's verified customer — it cannot look up anyone else.",
    parameters: Type.Object({}),
    execute: async (_id, _params, signal) => {
      const customerId = requireCustomer(context, "lookup_customer_account");
      const profile = await context.connectors.crm.getCustomer(customerId, signal);
      if (profile === null) {
        throw new Error(`No CRM record found for verified customer "${customerId}".`);
      }
      return textResult(JSON.stringify(profile, null, 2), { customerId });
    },
  };

  const lookupCustomerSetup: AgentTool = {
    name: "lookup_customer_setup",
    label: "Look up customer deployment",
    description:
      "Fetch the verified customer's deployment state: product edition, running version, environment, " +
      "configuration, dependency versions, known issues. Use before giving version-specific or upgrade advice. " +
      "Always bound to the ticket's verified customer.",
    parameters: Type.Object({}),
    execute: async (_id, _params, signal) => {
      const customerId = requireCustomer(context, "lookup_customer_setup");
      const setup = await context.connectors.deployments.getSetup(customerId, signal);
      if (setup === null) {
        throw new Error(`No deployment record found for verified customer "${customerId}".`);
      }
      return textResult(JSON.stringify(setup, null, 2), { customerId });
    },
  };

  const escalateToHuman: AgentTool = {
    name: "escalate_to_human",
    label: "Escalate to a human",
    description:
      "Escalate this ticket to a human colleague. Use when the customer asks for a human, when an action " +
      "is required that you cannot perform (billing changes, refunds, contract changes, account access), or " +
      "when you cannot resolve the issue with the available tools. After calling this, write a short " +
      "customer-facing reply saying a colleague will follow up — do not include internal details.",
    parameters: Type.Object({
      reason: Type.String({
        description: "Internal reason for the escalation (not shown to the customer)",
      }),
    }),
    execute: async (_id, rawParams, signal) => {
      const params = rawParams as { reason: string };
      // Outbound state change on the ticketing platform (mocked for now —
      // the real connector will call the external system's API).
      const ack = await context.connectors.ticketing.escalateTicket({
        threadId: context.threadId,
        customerId: context.customerId,
        reason: params.reason,
      }, signal);
      if (!ack.accepted) {
        throw new Error("Ticketing system did not accept the escalation — try again or tell the customer a colleague will follow up manually.");
      }
      context.escalation.escalated = true;
      context.escalation.reason = params.reason;
      context.escalation.externalReference = ack.externalReference;
      return textResult(
        `Escalation recorded (ticketing reference ${ack.externalReference}) — a human colleague will take over this ticket. ` +
          "Now write a brief, warm reply telling the customer a specialist will follow up shortly.",
        { reason: params.reason, externalReference: ack.externalReference },
      );
    },
  };

  return [searchKnowledgeBase, lookupCustomerAccount, lookupCustomerSetup, escalateToHuman]
    .map((tool) => instrument(context, tool));
}
