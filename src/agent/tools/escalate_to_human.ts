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
}
