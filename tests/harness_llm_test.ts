import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { createModels, fauxAssistantMessage, fauxProvider } from "@earendil-works/pi-ai";
import type { Context } from "@earendil-works/pi-ai";
import { createLlmHarness } from "../src/agent/harness.ts";
import { hydrateThreadHistory } from "../src/agent/hydrator.ts";
import type { MessageRecord } from "../src/db/messages.ts";

function record(id: string, role: MessageRecord["role"], content: string, createdAt: number): MessageRecord {
  return {
    id,
    threadId: "tkt_1",
    customerId: "cust_7",
    role,
    content,
    status: "completed",
    inReplyTo: null,
    workerId: null,
    lockedAt: null,
    attemptCount: 1,
    error: null,
    model: null,
    tokensIn: null,
    tokensOut: null,
    costUsd: null,
    metadata: null,
    sentToCustomerAt: null,
    createdAt,
    completedAt: createdAt,
  };
}

function makeHarness() {
  const faux = fauxProvider();
  const models = createModels();
  models.setProvider(faux.provider);
  const model = faux.getModel();
  const harness = createLlmHarness({
    provider: faux.provider.id,
    modelId: model.id,
    apiKey: "test-key",
    models,
    model,
  });
  return { faux, harness };
}

Deno.test("llm harness maps the faux provider reply to AgentReply with telemetry", async () => {
  const { faux, harness } = makeHarness();
  faux.setResponses([fauxAssistantMessage("Hello! Your order ships Tuesday.")]);

  const reply = await harness.run({
    threadId: "tkt_1",
    customerId: "cust_7",
    message: record("m1", "customer", "where is my order?", 1000),
    history: [],
  });

  assertEquals(reply.content, "Hello! Your order ships Tuesday.");
  assertStringIncludes(reply.model ?? "", faux.provider.id + ":");
  assert(typeof reply.tokensIn === "number");
  assert(typeof reply.tokensOut === "number");
  assert(typeof reply.costUsd === "number");
});

Deno.test("llm harness sends hydrated history + anchor + follow-ups and the support system prompt", async () => {
  const { faux, harness } = makeHarness();
  let seen: Context | undefined;
  faux.setResponses([(context) => {
    seen = context;
    return fauxAssistantMessage("consolidated answer");
  }]);

  const history = [
    record("h1", "customer", "hi there", 1000),
    record("h2", "assistant", "hello, how can I help?", 2000),
  ];
  const reply = await harness.run({
    threadId: "tkt_1",
    customerId: "cust_7",
    message: record("m1", "customer", "first question", 3000),
    history,
    followUps: [
      record("m2", "customer", "second question", 4000),
      record("m3", "customer", "third question", 5000),
    ],
  });

  assertEquals(reply.content, "consolidated answer");
  assert(seen !== undefined, "faux provider never received a request");
  assertStringIncludes(seen.systemPrompt ?? "", "tkt_1");
  assertStringIncludes(seen.systemPrompt ?? "", "cust_7");
  const roles = seen.messages.map((m) => m.role);
  assertEquals(roles, ["user", "assistant", "user", "user", "user"]);
  const texts = seen.messages.map((m) =>
    typeof m.content === "string"
      ? m.content
      : m.content.map((b) => (b.type === "text" ? b.text : "")).join("")
  );
  assertEquals(texts, [
    "hi there",
    "hello, how can I help?",
    "first question",
    "second question",
    "third question",
  ]);
});

Deno.test("llm harness throws on provider error so the worker retry path engages", async () => {
  const { faux, harness } = makeHarness();
  faux.setResponses([
    fauxAssistantMessage("", { stopReason: "error", errorMessage: "provider exploded" }),
  ]);

  await assertRejects(
    () =>
      harness.run({
        threadId: "tkt_1",
        customerId: "cust_7",
        message: record("m1", "customer", "hello?", 1000),
        history: [],
      }),
    Error,
    "provider exploded",
  );
});

Deno.test("hydrateThreadHistory maps roles and preserves order/timestamps", () => {
  const messages = hydrateThreadHistory([
    record("c1", "customer", "first", 1000),
    record("a1", "assistant", "reply", 2000),
    record("s1", "system", "operational marker", 2500),
    record("c2", "customer", "second", 3000),
  ]);
  assertEquals(messages.map((m) => m.role), ["user", "assistant", "user"]);
  assertEquals(messages[0], { role: "user", content: "first", timestamp: 1000 });
  const assistant = messages[1];
  assert(assistant.role === "assistant");
  assertEquals(assistant.timestamp, 2000);
  assertEquals(
    assistant.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text),
    ["reply"],
  );
});
