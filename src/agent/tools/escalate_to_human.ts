/**
 * The escalate_to_human support tool (spec §6.1): hands the ticket to a human
 * colleague via the TicketingConnector.escalateTicket outbound call, requires
 * an accepted ack, and records reason + platform reference on the run's
 * EscalationState — which the harness copies onto the reply row's metadata
 * for the dispatcher. The reply text itself stays customer-safe.
 */
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { textResult, type ToolRunContext } from "./context.ts";

export function buildEscalateToHuman(context: ToolRunContext): AgentTool {
  return {
    name: "escalate_to_human",
    label: "Escalate to a human",
    description:
      "Escalate this ticket to a human colleague. Use when the customer asks for a human, when an action " +
      "is required that you cannot perform (billing changes, refunds, contract changes, account access), or " +
      "when you cannot resolve the issue with the available tools. After calling this, write a short " +
      "customer-facing reply saying a colleague is reviewing the case. A human response will later return " +
      "as internal context so you can continue the ticket — do not include internal details.",
    parameters: Type.Object({
      reason: Type.String({
        description: "Internal reason for the escalation (not shown to the customer)",
      }),
      request: Type.String({
        description:
          "The concrete question, decision, or action the human colleague must answer or perform so you can continue the ticket",
      }),
    }),
    execute: async (_id, rawParams, signal) => {
      const params = rawParams as { reason: string; request: string };
      // Outbound state change on the ticketing platform (mocked for now —
      // the real connector will call the external system's API).
      const ack = await context.connectors.ticketing.escalateTicket({
        threadId: context.threadId,
        idempotencyKey: `${context.threadId}:${context.messageId}`,
        customerId: context.customerId,
        reason: params.reason,
        request: params.request,
      }, signal);
      if (!ack.accepted) {
        throw new Error("Ticketing system did not accept the escalation — try again or tell the customer a colleague will follow up manually.");
      }
      context.escalation.escalated = true;
      context.escalation.reason = params.reason;
      context.escalation.request = params.request;
      context.escalation.externalReference = ack.externalReference;
      return textResult(
        `Escalation recorded (ticketing reference ${ack.externalReference}) — a human colleague will review: ${params.request}. ` +
          "Now write a brief, warm reply telling the customer a specialist is reviewing the case and you will follow up.",
        { reason: params.reason, request: params.request, externalReference: ack.externalReference },
      );
    },
  };
}
