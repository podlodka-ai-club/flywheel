/**
 * Tests for the LLM thread summarizer (src/memory/strategies/structured/summarize_llm.ts) via the
 * faux provider: parsing model responses that fence the JSON in markdown or
 * wrap it in prose, and throwing on JSON-free output so the summarizer sweep
 * retries the thread later.
 */
import { assertEquals, assertRejects } from "@std/assert";
import { createModels, fauxAssistantMessage, fauxProvider } from "@earendil-works/pi-ai";
import { createLlmThreadSummarizer } from "../src/memory/strategies/structured/summarize_llm.ts";
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

function makeSummarizer() {
  const faux = fauxProvider();
  const models = createModels();
  models.setProvider(faux.provider);
  const model = faux.getModel();
  const summarize = createLlmThreadSummarizer(
    { provider: faux.provider.id, modelId: model.id, apiKey: "test-key" },
    { models, model },
  );
  return { faux, summarize };
}

const input = {
  threadId: "tkt_1",
  customerId: "cust_7",
  messages: [
    record("m1", "customer", "export to CSV fails", 1000),
    record("m2", "assistant", "Fixed by re-enabling the exporter.", 2000),
  ],
};

Deno.test("llm summarizer parses JSON wrapped in a markdown fence", async () => {
  const { faux, summarize } = makeSummarizer();
  // Real-world gemini-flash shape that broke tkt_qqkc: ```json fence around clean JSON.
  faux.setResponses([
    fauxAssistantMessage(
      '```json\n{\n  "episode": "CSV export failed; exporter re-enabled.",\n  "playbook": null\n}\n```',
    ),
  ]);

  const summary = await summarize(input);
  assertEquals(summary.episode, "CSV export failed; exporter re-enabled.");
  assertEquals(summary.playbook, null);
});

Deno.test("llm summarizer tolerates prose around the JSON object", async () => {
  const { faux, summarize } = makeSummarizer();
  faux.setResponses([
    fauxAssistantMessage(
      'Here is the summary:\n{"episode": "Issue resolved.", "playbook": "Symptom: export fails -> Fix: re-enable exporter"}\nLet me know if you need anything else.',
    ),
  ]);

  const summary = await summarize(input);
  assertEquals(summary.episode, "Issue resolved.");
  assertEquals(summary.playbook, "Symptom: export fails -> Fix: re-enable exporter");
});

Deno.test("llm summarizer throws on a response with no JSON so the sweep retries", async () => {
  const { faux, summarize } = makeSummarizer();
  faux.setResponses([fauxAssistantMessage("I could not produce a summary.")]);

  await assertRejects(() => summarize(input), Error);
});
