/**
 * Tests for the memory strategy seam (src/memory/strategy.ts, registry.ts):
 * strategy selection (MEMORY_STRATEGY env var, `--memory=<name>` CLI
 * override, unknown names rejected with the registered list), the
 * `structured` strategy exercised purely through the seam (run-handle
 * hydration + id-free tools, audit surface, background-job lifecycle), and
 * the engine's strategy-agnostic wiring: the worker opens a run handle only
 * for verified customers, and the LLM harness renders whatever section and
 * tools a strategy provides.
 */
import { assert, assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { createModels, fauxAssistantMessage, fauxProvider, Type } from "@earendil-works/pi-ai";
import type { Context } from "@earendil-works/pi-ai";
import { join } from "node:path";
import { createLlmHarness } from "../src/agent/harness.ts";
import type { AgentHarness, AgentRunInput } from "../src/agent/harness.ts";
import { textResult } from "../src/agent/tools/context.ts";
import { loadConfig } from "../src/config.ts";
import { openDb } from "../src/db/client.ts";
import { getMessage, insertCustomerMessage } from "../src/db/messages.ts";
import type { MessageRecord } from "../src/db/messages.ts";
import { startWorkers } from "../src/engine/worker.ts";
import { createMemoryStrategy, listMemoryStrategies } from "../src/memory/registry.ts";
import type { MemoryRun, MemoryStrategy } from "../src/memory/strategy.ts";
import { createStructuredMemoryStrategy } from "../src/memory/strategies/structured/index.ts";

async function withTempDb(fn: (db: ReturnType<typeof openDb>) => Promise<void> | void) {
  const dir = await Deno.makeTempDir({ prefix: "flywheel_memstrategy_test_" });
  const db = openDb(join(dir, "test.db"));
  try {
    await fn(db);
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 5000, stepMs = 20): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  throw new Error("waitFor timed out");
}

function record(id: string, content: string, createdAt: number): MessageRecord {
  return {
    id,
    threadId: "tkt_1",
    customerId: "google",
    role: "customer",
    content,
    status: "processing",
    inReplyTo: null,
    workerId: "w1",
    lockedAt: createdAt,
    attemptCount: 1,
    error: null,
    model: null,
    tokensIn: null,
    tokensOut: null,
    costUsd: null,
    metadata: null,
    sentToCustomerAt: null,
    createdAt,
    completedAt: null,
  };
}

const STRUCTURED_CONFIG = {
  llmProvider: "openrouter",
  summarizerProvider: "",
  summarizerModel: "",
  summarizeAfterMs: 60_000,
  memoryHydrationBudget: 800,
  memoryRunWriteCap: 2,
  memoryActiveCap: 100,
};

Deno.test("config: MEMORY_STRATEGY selects the strategy; --memory=<name> overrides it per process", () => {
  const previous = Deno.env.get("MEMORY_STRATEGY");
  try {
    Deno.env.delete("MEMORY_STRATEGY");
    assertEquals(loadConfig([]).memoryStrategy, "structured");
    assertEquals(loadConfig(["--memory=alt"]).memoryStrategy, "alt");
    assertEquals(loadConfig(["--memory", "alt2"]).memoryStrategy, "alt2");
    // A dangling flag is not a value.
    assertEquals(loadConfig(["--memory"]).memoryStrategy, "structured");
    assertEquals(loadConfig(["--memory", "--other"]).memoryStrategy, "structured");
    assertEquals(loadConfig(["--memory="]).memoryStrategy, "structured");

    Deno.env.set("MEMORY_STRATEGY", "from_env");
    assertEquals(loadConfig([]).memoryStrategy, "from_env");
    assertEquals(loadConfig(["--memory=from_cli"]).memoryStrategy, "from_cli");
  } finally {
    if (previous === undefined) Deno.env.delete("MEMORY_STRATEGY");
    else Deno.env.set("MEMORY_STRATEGY", previous);
  }
});

Deno.test("registry: resolves registered names; unknown names fail fast listing the options", async () => {
  await withTempDb((db) => {
    const config = loadConfig([]);
    assert(listMemoryStrategies().includes("structured"));
    assertEquals(createMemoryStrategy("structured", { db, config }).name, "structured");

    const error = assertThrows(
      () => createMemoryStrategy("nope", { db, config }),
      Error,
      'Unknown memory strategy "nope"',
    );
    assertStringIncludes(error.message, "structured");
    assertStringIncludes(error.message, "--memory");
  });
});

Deno.test("structured strategy through the seam: hydration, id-free tools, audit, job lifecycle", async () => {
  await withTempDb(async (db) => {
    const strategy = createStructuredMemoryStrategy({ db, config: STRUCTURED_CONFIG });
    const run = strategy.openRun({ customerId: "google", threadId: "tkt_1" });
    const context = { message: record("m1", "hello", 1000), followUps: [], history: [] };

    // Nothing known yet: no section, honest stats.
    const empty = await run.hydrate(context);
    assertEquals(empty.section, null);
    assertEquals(empty.stats.count, 0);

    // The strategy owns its tools and their prompt guidance; none takes a customer id.
    const tools = run.tools();
    assertEquals(tools.map((t) => t.name), ["save_memory", "archive_memory"]);
    for (const t of tools) {
      const params = Object.keys((t.parameters as { properties?: object }).properties ?? {});
      assert(!params.some((p) => /customer/i.test(p)), `${t.name} must not take a customer id`);
    }
    assertStringIncludes(run.toolGuidance(), "save_memory");

    // Write path 1 through the tool → audit surface → read path, rendered as a claim.
    const save = tools.find((t) => t.name === "save_memory");
    assert(save !== undefined);
    await save.execute("tc1", { content: "deploys through Terraform" }, undefined, undefined);
    const entries = strategy.audit.listEntries("google");
    assertEquals(entries.length, 1);
    assertEquals(entries[0].provenance, "customer_stated");
    assertEquals(strategy.audit.listCustomers(), [{ customerId: "google", count: 1 }]);
    const hydrated = await run.hydrate(context);
    assertStringIncludes(hydrated.section ?? "", "deploys through Terraform");
    assertStringIncludes(hydrated.section ?? "", "claimed by customer");
    assertEquals(hydrated.stats.count, 1);

    // Audit operations are customer-fenced; erasure is the spec §10.6 hard delete.
    assertEquals(strategy.audit.archive("facebook", entries[0].id), false);
    assertEquals(strategy.audit.archive("google", entries[0].id), true);
    assertEquals(strategy.audit.erase("google"), 1);
    assertEquals(strategy.audit.listEntries("google"), []);

    // Background job (echo summarizer, no LLM setup) starts and stops cleanly.
    const job = strategy.startJobs();
    assert(job !== null);
    await job.stop();
    assertEquals(strategy.describe().summarizeAfterMs, 60_000);
    assertEquals(strategy.describe().summarizerProvider, null);
  });
});

Deno.test("worker opens a run handle from the configured strategy — for verified customers only", async () => {
  await withTempDb(async (db) => {
    const opened: string[] = [];
    const strategy: MemoryStrategy = {
      name: "fake",
      openRun: (input) => {
        opened.push(`${input.customerId}@${input.threadId}`);
        return {
          customerId: input.customerId,
          hydrate: () => Promise.resolve({ section: null, stats: {} }),
          tools: () => [],
          toolGuidance: () => "",
        };
      },
      startJobs: () => null,
      audit: { listCustomers: () => [], listEntries: () => [], archive: () => false, erase: () => 0 },
      describe: () => ({}),
    };
    const seen = new Map<string, string | null>();
    const harness: AgentHarness = {
      mode: "scripted",
      run: (input: AgentRunInput) => {
        seen.set(input.message.id, input.memory?.customerId ?? null);
        return Promise.resolve({
          content: "ok",
          model: "scripted",
          tokensIn: null,
          tokensOut: null,
          costUsd: null,
        });
      },
    };
    insertCustomerMessage(db, { id: "m_verified", threadId: "t1", content: "hi", customerId: "google", createdAt: 1000 });
    insertCustomerMessage(db, { id: "m_anon", threadId: "t2", content: "hi", createdAt: 1001 });

    const pool = startWorkers(db, harness, {
      workerConcurrency: 1,
      pollIntervalMs: 10,
      maxRetries: 1,
      memory: strategy,
    });
    try {
      await waitFor(() => ["m_verified", "m_anon"].every((id) => getMessage(db, id)?.status === "completed"));
    } finally {
      await pool.stop();
    }
    assertEquals(opened, ["google@t1"]);
    assertEquals(seen.get("m_verified"), "google");
    assertEquals(seen.get("m_anon"), null);
  });
});

Deno.test("llm harness renders a strategy's section and offers its tools, whatever the strategy", async () => {
  const faux = fauxProvider();
  const models = createModels();
  models.setProvider(faux.provider);
  let seen: Context | undefined;
  faux.setResponses([(context) => {
    seen = context;
    return fauxAssistantMessage("noted");
  }]);
  const harness = createLlmHarness({
    provider: faux.provider.id,
    modelId: faux.getModel().id,
    apiKey: "test-key",
    models,
    model: faux.getModel(),
  });

  let hydratedWith: string[] = [];
  const memory: MemoryRun = {
    customerId: "google",
    hydrate: (context) => {
      hydratedWith = [context.message.content, ...context.followUps.map((m) => m.content)];
      return Promise.resolve({ section: "- [notes] prefers the CLI over the UI", stats: { notes: 1 } });
    },
    tools: () => [{
      name: "recall_notes",
      label: "Recall notes",
      description: "Search this customer's notes.",
      parameters: Type.Object({ query: Type.String() }),
      execute: () => Promise.resolve(textResult("nothing")),
    }],
    toolGuidance: () => "- recall_notes — search this customer's notes before answering.",
  };

  const reply = await harness.run({
    threadId: "tkt_1",
    customerId: "google",
    message: record("m1", "which flag disables retries?", 1000),
    history: [],
    followUps: [record("m2", "and the batch size?", 2000)],
    memory,
  });

  assertEquals(reply.content, "noted");
  assert(seen !== undefined, "faux provider never received a request");
  assertStringIncludes(seen.systemPrompt ?? "", "prefers the CLI over the UI");
  assertStringIncludes(seen.systemPrompt ?? "", "recall_notes — search");
  assert((seen.tools ?? []).some((t) => t.name === "recall_notes"), "strategy tool not offered");
  // Retrieval-style strategies get the whole run to rank against.
  assertEquals(hydratedWith, ["which flag disables retries?", "and the batch size?"]);
});
