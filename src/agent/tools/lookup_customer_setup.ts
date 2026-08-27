import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { requireCustomer, textResult, type ToolRunContext } from "./context.ts";

export function buildLookupCustomerSetup(context: ToolRunContext): AgentTool {
  return {
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
}
