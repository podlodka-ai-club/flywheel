import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { requireCustomer, textResult, type ToolRunContext } from "./context.ts";

export function buildLookupCustomerAccount(context: ToolRunContext): AgentTool {
  return {
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
}
