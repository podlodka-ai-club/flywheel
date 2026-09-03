/**
 * Tests for the LLM thread summarizer (src/memory/strategies/structured/summarize_llm.ts) via the
 * faux provider: parsing model responses that fence the JSON in markdown or
 * wrap it in prose, and throwing on JSON-free output so the summarizer sweep
 * retries the thread later.
 */
import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { createModels, fauxAssistantMessage, fauxProvider } from "@earendil-works/pi-ai";
import type { Context } from "@earendil-works/pi-ai";
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

Deno.test("llm summarizer marks team notes per author and instructs the model on discussion-derived playbooks", async () => {
  const { faux, summarize } = makeSummarizer();
  let seen: Context | undefined;
  faux.setResponses([(context) => {
    seen = context;
    return fauxAssistantMessage('{"episode": "Export failed; exporter re-enabled.", "playbook": null}');
  }]);

  await summarize({
    ...input,
    messages: [
      ...input.messages,
      {
        ...record("n1", "system", "Maybe the exporter license expired?", 3000),
        metadata: { type: "internal_note", channel: "dev-ui", author: { id: "ana", name: "Ana Petrova" } },
      },
      {
        ...record("n2", "system", "No — the exporter was disabled; re-enable it.", 4000),
        metadata: { type: "internal_note", author: { id: "ben" } }, // no name: falls back
      },
      {
        ...record("hr", "system", "Re-enabled the exporter.", 5000),
        metadata: { type: "human_resolution" },
      },
    ],
  });
  assert(seen !== undefined);
  const transcript = JSON.stringify(seen.messages);
  assertStringIncludes(transcript, "[internal team note — Ana Petrova] Maybe the exporter license expired?");
  assertStringIncludes(transcript, "[internal team note — colleague] No — the exporter was disabled");
  assertStringIncludes(transcript, "[internal resolution note] Re-enabled the exporter.");
  assert(!transcript.includes("[system]"), "note rows must not render as bare system lines");
  assertStringIncludes(seen.systemPrompt ?? "", "internal team note");
  assertStringIncludes(seen.systemPrompt ?? "", "withdrawn");
});

Deno.test("llm summarizer throws on a response with no JSON so the sweep retries", async () => {
  const { faux, summarize } = makeSummarizer();
  faux.setResponses([fauxAssistantMessage("I could not produce a summary.")]);

  await assertRejects(() => summarize(input), Error);
});
