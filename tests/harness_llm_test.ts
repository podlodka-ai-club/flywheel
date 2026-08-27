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

Deno.test("thinking level is clamped to the model's capabilities", async () => {
  // Non-reasoning faux model: a requested "medium" must clamp down to "off".
  const fauxPlain = fauxProvider();
  const plainModels = createModels();
  plainModels.setProvider(fauxPlain.provider);
  let plainOptions: { reasoning?: string } | undefined;
  fauxPlain.setResponses([(_context, options) => {
    plainOptions = options;
    return fauxAssistantMessage("plain ok");
  }]);
  const plainHarness = createLlmHarness({
    provider: fauxPlain.provider.id,
    modelId: fauxPlain.getModel().id,
    apiKey: "test-key",
    thinkingLevel: "medium",
    models: plainModels,
    model: fauxPlain.getModel(),
  });
  await plainHarness.run({
    threadId: "tkt_1",
    customerId: "cust_7",
    message: record("m1", "customer", "hi", 1000),
    history: [],
  });
  assertEquals(plainOptions?.reasoning ?? "off", "off");

  // Reasoning-capable faux model: "medium" passes through unchanged.
  const fauxReasoning = fauxProvider({ models: [{ id: "faux-reasoner", reasoning: true }] });
  const reasoningModels = createModels();
  reasoningModels.setProvider(fauxReasoning.provider);
  let reasoningOptions: { reasoning?: string } | undefined;
  fauxReasoning.setResponses([(_context, options) => {
    reasoningOptions = options;
    return fauxAssistantMessage("reasoned ok");
  }]);
  const reasoningHarness = createLlmHarness({
    provider: fauxReasoning.provider.id,
    modelId: "faux-reasoner",
    apiKey: "test-key",
    thinkingLevel: "medium",
    models: reasoningModels,
    model: fauxReasoning.getModel("faux-reasoner"),
  });
  await reasoningHarness.run({
    threadId: "tkt_1",
    customerId: "cust_7",
    message: record("m1", "customer", "hi", 1000),
    history: [],
  });
  assertEquals(reasoningOptions?.reasoning, "medium");
});

Deno.test("'reasoning is mandatory' rejection auto-bumps the thinking level, retries, and memoizes", async () => {
  const faux = fauxProvider({ models: [{ id: "faux-mandatory", reasoning: true }] });
  const models = createModels();
  models.setProvider(faux.provider);
  const seenLevels: (string | undefined)[] = [];
  const capture = (reply: string) => (_context: Context, options?: { reasoning?: string }) => {
    seenLevels.push(options?.reasoning);
    return fauxAssistantMessage(reply);
  };
  faux.setResponses([
    // The catalog said "off" is fine; the live endpoint disagrees.
    (_context: Context, options?: { reasoning?: string }) => {
      seenLevels.push(options?.reasoning);
      return fauxAssistantMessage("", {
        stopReason: "error",
        errorMessage: "Reasoning is mandatory for this endpoint and cannot be disabled",
      });
    },
    capture("recovered reply"),
    capture("second message reply"),
  ]);
  const harness = createLlmHarness({
    provider: faux.provider.id,
    modelId: "faux-mandatory",
    apiKey: "test-key",
    thinkingLevel: "off",
    models,
    model: faux.getModel("faux-mandatory"),
  });

  const first = await harness.run({
    threadId: "tkt_1",
    customerId: "cust_7",
    message: record("m1", "customer", "hello", 1000),
    history: [],
  });
  assertEquals(first.content, "recovered reply");

  // Memoized: the next run goes straight to the bumped level, no failed call.
  const second = await harness.run({
    threadId: "tkt_1",
    customerId: "cust_7",
    message: record("m2", "customer", "again", 2000),
    history: [],
  });
  assertEquals(second.content, "second message reply");
  // pi omits the reasoning option entirely at "off" — hence undefined first.
  assertEquals(seenLevels, [undefined, "minimal", "minimal"]);
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

Deno.test("tool loop e2e: escalation flag lands on reply metadata; KB result reaches the model", async () => {
  const { fauxToolCall } = await import("@earendil-works/pi-ai");
  const faux = fauxProvider();
  const models = createModels();
  models.setProvider(faux.provider);

  let toolResultSeen = "";
  faux.setResponses([
    // Turn 1: the model searches the docs, then escalates.
    fauxAssistantMessage([
      fauxToolCall("search_knowledge_base", { query: "csv export" }),
      fauxToolCall("escalate_to_human", { reason: "billing action required" }),
    ], { stopReason: "toolUse" }),
    // Turn 2: sees the tool results, writes the customer-facing reply.
    (context: Context) => {
      const toolResults = context.messages.filter((m) => m.role === "toolResult");
      toolResultSeen = JSON.stringify(toolResults.map((m) =>
        m.content.map((b) => (b.type === "text" ? b.text : "")).join("")
      ));
      return fauxAssistantMessage("A specialist will follow up shortly about your billing question.");
    },
  ]);

  const harness = createLlmHarness({
    provider: faux.provider.id,
    modelId: faux.getModel().id,
    apiKey: "test-key",
    models,
    model: faux.getModel(),
  });
  const reply = await harness.run({
    threadId: "tkt_1",
    customerId: "google",
    message: record("m1", "customer", "I was double charged, need a refund", 1000),
    history: [],
  });

  assertEquals(reply.content, "A specialist will follow up shortly about your billing question.");
  const metadata = reply.metadata as Record<string, unknown>;
  assertEquals(metadata.escalated, true);
  assertEquals(metadata.escalation_reason, "billing action required");
  // The mocked ticketing call's reference rides along for platform correlation.
  assert(/^esc_[0-9a-f]{8}$/.test(String(metadata.escalation_reference)));
  // The KB article text made it into the tool results the model saw.
  assertStringIncludes(toolResultSeen, "Exporting data to CSV");
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
