/**
 * Tests for the LLM harness and hydrator (src/agent/harness.ts,
 * src/agent/hydrator.ts) using pi-ai's network-free faux provider: reply and
 * telemetry mapping, hydrated history + follow-ups + system prompt assembly,
 * thinking-level clamping and the "reasoning is mandatory" auto-bump with
 * memoization, provider-error propagation to the worker retry path, the tool
 * loop end to end (KB results reaching the model while fixture-backed data
 * lookups stay disconnected), and the memory read/write paths through a real
 * agent run.
 */
import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
} from "@earendil-works/pi-ai";
import type { Context } from "@earendil-works/pi-ai";
import { createLlmHarness } from "../src/agent/harness.ts";
import {
  buildPromptMessages,
  hydrateThreadHistory,
} from "../src/agent/hydrator.ts";
import type { MessageRecord } from "../src/db/messages.ts";

function record(
  id: string,
  role: MessageRecord["role"],
  content: string,
  createdAt: number,
): MessageRecord {
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
  assertStringIncludes(seen.systemPrompt ?? "", "Acme Hotels Inc.");
  assertStringIncludes(seen.systemPrompt ?? "", "AcmeStream");
  assertStringIncludes(seen.systemPrompt ?? "", "tkt_1");
  assertStringIncludes(seen.systemPrompt ?? "", "cust_7");
  assert(!(seen.systemPrompt ?? "").includes("lookup_customer_setup"));
  assert(!(seen.systemPrompt ?? "").includes("lookup_customer_account"));
  assertStringIncludes(seen.systemPrompt ?? "", "escalate_to_human");
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
  const fauxReasoning = fauxProvider({
    models: [{ id: "faux-reasoner", reasoning: true }],
  });
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
  const faux = fauxProvider({
    models: [{ id: "faux-mandatory", reasoning: true }],
  });
  const models = createModels();
  models.setProvider(faux.provider);
  const seenLevels: (string | undefined)[] = [];
  const capture = (reply: string) =>
  (
    _context: Context,
    options?: { reasoning?: string },
  ) => {
    seenLevels.push(options?.reasoning);
    return fauxAssistantMessage(reply);
  };
  faux.setResponses([
    // The catalog said "off" is fine; the live endpoint disagrees.
    (_context: Context, options?: { reasoning?: string }) => {
      seenLevels.push(options?.reasoning);
      return fauxAssistantMessage("", {
        stopReason: "error",
        errorMessage:
          "Reasoning is mandatory for this endpoint and cannot be disabled",
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
    fauxAssistantMessage("", {
      stopReason: "error",
      errorMessage: "provider exploded",
    }),
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

Deno.test("tool loop e2e: KB result reaches the model without fixture-backed external tools", async () => {
  const { fauxToolCall } = await import("@earendil-works/pi-ai");
  const faux = fauxProvider();
  const models = createModels();
  models.setProvider(faux.provider);

  let toolResultSeen = "";
  faux.setResponses([
    // Turn 1: the model searches the real local documentation source.
    fauxAssistantMessage([
      fauxToolCall("search_knowledge_base", {
        query: "content not updating after publish",
      }),
    ], { stopReason: "toolUse" }),
    // Turn 2: sees the tool results, writes the customer-facing reply.
    (context: Context) => {
      const toolResults = context.messages.filter((m) =>
        m.role === "toolResult"
      );
      toolResultSeen = JSON.stringify(
        toolResults.map((m) =>
          m.content.map((b) => (b.type === "text" ? b.text : "")).join("")
        ),
      );
      return fauxAssistantMessage(
        "Republish the affected content from the admin panel.",
      );
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
    message: record(
      "m1",
      "customer",
      "The TV content did not update after publishing",
      1000,
    ),
    history: [],
  });

  assertEquals(
    reply.content,
    "Republish the affected content from the admin panel.",
  );
  assertEquals(reply.metadata, null);
  // The KB article text made it into the tool results the model saw.
  assertStringIncludes(
    toolResultSeen,
    "X-004 — Content changed in the admin panel",
  );
  assertStringIncludes(toolResultSeen, "Source: Confusable Symptoms");
});

Deno.test("memory e2e: hydrated memories reach the system prompt; save_memory persists via the agent loop", async () => {
  const { fauxToolCall } = await import("@earendil-works/pi-ai");
  const { openDb } = await import("../src/db/client.ts");
  const { createStructuredMemoryStrategy } = await import(
    "../src/memory/strategies/structured/index.ts"
  );
  const { listActiveMemories, saveMemory } = await import(
    "../src/memory/strategies/structured/store.ts"
  );
  const { join } = await import("node:path");

  const dir = await Deno.makeTempDir({ prefix: "flywheel_memharness_test_" });
  const db = openDb(join(dir, "test.db"));
  try {
    saveMemory(db, {
      customerId: "cust_7",
      kind: "fact",
      content: "maintenance window is Sunday 02:00",
      provenance: "customer_stated",
      sourceThreadId: "tkt_seed",
    });
    // The run handle comes through the strategy seam, exactly as the worker opens it.
    const memory = createStructuredMemoryStrategy({
      db,
      config: {
        llmProvider: "openrouter",
        summarizerProvider: "",
        summarizerModel: "",
        summarizeAfterMs: 60_000,
        memoryHydrationBudget: 800,
        memoryRunWriteCap: 3,
        memoryActiveCap: 100,
      },
    });

    const faux = fauxProvider();
    const models = createModels();
    models.setProvider(faux.provider);
    let seenPrompt = "";
    faux.setResponses([
      (context: Context) => {
        seenPrompt = context.systemPrompt ?? "";
        return fauxAssistantMessage(
          [fauxToolCall("save_memory", {
            content: "deploys through Terraform",
          })],
          { stopReason: "toolUse" },
        );
      },
      fauxAssistantMessage("Noted — I'll keep that in mind."),
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
      customerId: "cust_7",
      message: record(
        "m1",
        "customer",
        "we deploy through Terraform, please remember",
        1000,
      ),
      history: [],
      memory: memory.openRun({ customerId: "cust_7", threadId: "tkt_1" }),
    });

    assertEquals(reply.content, "Noted — I'll keep that in mind.");
    // Read path: the seeded memory was hydrated into the system prompt, as a claim.
    assertStringIncludes(seenPrompt, "maintenance window is Sunday 02:00");
    assertStringIncludes(seenPrompt, "claimed by customer");
    assertStringIncludes(seenPrompt, "save_memory");
    // Write path: the tool call persisted with forced provenance.
    const facts = listActiveMemories(db, "cust_7").map((m) => ({
      c: m.content,
      p: m.provenance,
    }));
    assert(
      facts.some((f) =>
        f.c === "deploys through Terraform" && f.p === "customer_stated"
      ),
    );
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("hydrateThreadHistory maps roles and preserves order/timestamps", () => {
  const messages = hydrateThreadHistory([
    record("c1", "customer", "first", 1000),
    record("a1", "assistant", "reply", 2000),
    record("s1", "system", "operational marker", 2500),
    record("c2", "customer", "second", 3000),
  ]);
  assertEquals(messages.map((m) => m.role), ["user", "assistant", "user"]);
  assertEquals(messages[0], {
    role: "user",
    content: "first",
    timestamp: 1000,
  });
  const assistant = messages[1];
  assert(assistant.role === "assistant");
  assertEquals(assistant.timestamp, 2000);
  assertEquals(
    assistant.content.filter((b) => b.type === "text").map((b) =>
      (b as { text: string }).text
    ),
    ["reply"],
  );
});

Deno.test("internal team notes never reach a live run: not hydrated, absent from the model context", async () => {
  const note = {
    ...record(
      "n1",
      "system",
      "SENTINEL-ZEBRA-7: internal hypothesis, do not repeat",
      1500,
    ),
    metadata: {
      type: "internal_note",
      channel: "dev-ui",
      author: { id: "ana", name: "Ana Petrova" },
    },
  };
  const history = [
    record("c1", "customer", "The TV shows stale content", 1000),
    note,
    record("a1", "assistant", "Let me check.", 2000),
  ];
  assertEquals(hydrateThreadHistory(history).length, 2);

  const { faux, harness } = makeHarness();
  let seen: Context | undefined;
  faux.setResponses([(context) => {
    seen = context;
    return fauxAssistantMessage("Please republish the channel list.");
  }]);
  await harness.run({
    threadId: "tkt_1",
    customerId: "cust_7",
    message: record("c2", "customer", "still stale", 3000),
    history,
  });
  assert(seen !== undefined);
  assert(
    !JSON.stringify(seen).includes("SENTINEL-ZEBRA-7"),
    "team note leaked into the model context",
  );
});

Deno.test("human escalation responses are marked internal and produce continuation metadata", async () => {
  const { faux, harness } = makeHarness();
  let seen: Context | undefined;
  faux.setResponses([(context) => {
    seen = context;
    return fauxAssistantMessage(
      "The refund has been issued and will appear within five business days.",
    );
  }]);
  const response = {
    ...record(
      "human_1",
      "system",
      "Refund approved and issued; bank settlement is 3-5 business days.",
      3000,
    ),
    status: "processing" as const,
    inReplyTo: "assistant_escalation",
    metadata: {
      type: "human_escalation_response",
      escalation_reference: "esc_12345678",
      responder: "maria@support",
    },
  };

  const prompt = buildPromptMessages(response, []);
  assert(prompt[0].role === "user");
  assertStringIncludes(
    String(prompt[0].content),
    "internal response from a human support colleague",
  );
  assertStringIncludes(String(prompt[0].content), "not customer-authored text");

  const reply = await harness.run({
    threadId: "tkt_1",
    customerId: "cust_7",
    message: response,
    history: [
      record("c1", "customer", "Please refund the duplicate charge", 1000),
      record(
        "assistant_escalation",
        "assistant",
        "A specialist is reviewing this.",
        2000,
      ),
    ],
  });
  assert(seen !== undefined);
  const last = seen.messages.at(-1);
  assert(last?.role === "user");
  assertStringIncludes(String(last.content), "Refund approved and issued");
  assertEquals(reply.metadata, {
    human_assisted: true,
    continued_from_escalation: "assistant_escalation",
    continued_escalation_reference: "esc_12345678",
  });
});
