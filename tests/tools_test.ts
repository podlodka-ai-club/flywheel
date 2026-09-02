/**
 * Tests for the support tools (src/agent/tools/) over the direct Markdown KB
 * plus fixture-backed external connectors: search hits and honest misses, customer-scoped tools
 * exposing NO id parameter and failing without a verified identity, and
 * escalation recording the ticketing ack (reason + reference) or surfacing
 * a rejected call as a tool error.
 */
import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { createConnectors } from "../src/connectors/index.ts";
import { buildSupportTools, type ToolRunContext } from "../src/agent/tools/index.ts";

function makeContext(customerId: string | null): ToolRunContext {
  return {
    threadId: "tkt_1",
    messageId: "msg_anchor",
    customerId,
    connectors: createConnectors(),
    escalation: { escalated: false },
  };
}

function tool(context: ToolRunContext, name: string) {
  const found = buildSupportTools(context).find((t) => t.name === name);
  assert(found !== undefined, `tool ${name} missing`);
  return found;
}

function resultText(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
}

Deno.test("search_knowledge_base returns relevant Acme wiki articles", async () => {
  const context = makeContext("google");
  const result = await tool(context, "search_knowledge_base")
    .execute("tc1", { query: "content not updating on TV after publish" }, undefined, undefined);
  const text = resultText(result);
  assertStringIncludes(text, "T-TV-09 — Content does not update on the TV");
  assertStringIncludes(text, "t-tv-09");
  // deno-lint-ignore no-explicit-any
  assert((result.details as any).resultCount >= 1);
});

Deno.test("search_knowledge_base admits when nothing matches", async () => {
  const context = makeContext("google");
  const result = await tool(context, "search_knowledge_base")
    .execute("tc1", { query: "quantum blockchain espresso" }, undefined, undefined);
  assertStringIncludes(resultText(result), "No documentation articles matched");
});

Deno.test("customer-scoped tools are bound to the verified identity and take no id argument", async () => {
  const context = makeContext("facebook");
  for (const name of ["lookup_customer_account", "lookup_customer_setup"]) {
    const t = tool(context, name);
    // The scoping property: the schema exposes NO way to name another account.
    assertEquals(Object.keys((t.parameters as { properties?: object }).properties ?? {}), []);
  }

  const account = await tool(context, "lookup_customer_account")
    .execute("tc1", {}, undefined, undefined);
  assertStringIncludes(resultText(account), "Facebook Inc.");

  const setup = await tool(context, "lookup_customer_setup")
    .execute("tc2", {}, undefined, undefined);
  const setupText = resultText(setup);
  assertStringIncludes(setupText, "Acme TV 1.13");
  assertStringIncludes(setupText, "Ubuntu");
});

Deno.test("customer-scoped tools fail without a verified identity or CRM record", async () => {
  const anonymous = makeContext(null);
  await assertRejects(
    () => tool(anonymous, "lookup_customer_account").execute("tc1", {}, undefined, undefined),
    Error,
    "no verified customer identity",
  );

  const unknown = makeContext("cust_does_not_exist");
  await assertRejects(
    () => tool(unknown, "lookup_customer_setup").execute("tc1", {}, undefined, undefined),
    Error,
    "No deployment record",
  );
});

Deno.test("escalate_to_human calls the ticketing connector and records the escalation + reference", async () => {
  const context = makeContext("google");
  const result = await tool(context, "escalate_to_human")
    .execute("tc1", {
      reason: "customer requests refund",
      request: "Confirm whether the duplicate charge was refunded",
    }, undefined, undefined);
  assertEquals(context.escalation.escalated, true);
  assertEquals(context.escalation.reason, "customer requests refund");
  assertEquals(context.escalation.request, "Confirm whether the duplicate charge was refunded");
  // The mocked outbound ticketing call acknowledged with a platform reference.
  assert(/^esc_[0-9a-f]{8}$/.test(context.escalation.externalReference ?? ""));
  const text = resultText(result);
  assertStringIncludes(text, "specialist is reviewing");
  assertStringIncludes(text, context.escalation.externalReference ?? "");

  const retryContext = makeContext("google");
  await tool(retryContext, "escalate_to_human").execute("tc2", {
    reason: "customer requests refund",
    request: "Confirm whether the duplicate charge was refunded",
  }, undefined, undefined);
  assertEquals(
    retryContext.escalation.externalReference,
    context.escalation.externalReference,
    "same queue anchor must keep the same external reference across retries",
  );
});

Deno.test("escalate_to_human surfaces a rejected ticketing call as a tool error", async () => {
  const context = makeContext("google");
  context.connectors = {
    ...context.connectors,
    ticketing: {
      escalateTicket: () => Promise.resolve({ accepted: false, externalReference: "" }),
    },
  };
  await assertRejects(
    () =>
      tool(context, "escalate_to_human").execute(
        "tc1",
        { reason: "r", request: "Review it" },
        undefined,
        undefined,
      ),
    Error,
    "did not accept",
  );
  assertEquals(context.escalation.escalated, false);
});
