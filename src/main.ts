/**
 * Engine entrypoint (`deno task start`): the long-running process that turns
 * pending customer messages into completed replies. Wires config, logging,
 * the SQLite store, the agent harness (echo or LLM), the worker pool, the
 * zombie-lease reaper, and the memory summarizer together, logs the resolved
 * runtime settings, and shuts everything down gracefully on SIGINT/SIGTERM.
 */
import { config } from "./config.ts";
import { configureLogging, logger, teardownLogging } from "./logger/index.ts";
import { openDb } from "./db/client.ts";
import { createHarness, resolveLlmSetup } from "./agent/harness.ts";
import { startReaper } from "./engine/reaper.ts";
import { startWorkers } from "./engine/worker.ts";
import { createLlmThreadSummarizer } from "./memory/summarize_llm.ts";
import { createEchoThreadSummarizer, startSummarizer } from "./memory/summarizer.ts";

if (import.meta.main) {
  const logFile = configureLogging({ name: "engine" });
  const db = openDb(config.databasePath);
  const llmSetup = config.agentMode === "llm" ? resolveLlmSetup(config) : undefined;
  const harness = createHarness(config.agentMode, {
    devFaults: config.devFaults,
    llm: llmSetup,
  });
  const pool = startWorkers(db, harness, {
    workerConcurrency: config.workerConcurrency,
    pollIntervalMs: config.pollIntervalMs,
    maxRetries: config.maxRetries,
    memory: config.memoryEnabled
      ? {
        hydrationBudgetTokens: config.memoryHydrationBudget,
        runWriteCap: config.memoryRunWriteCap,
        activeCap: config.memoryActiveCap,
      }
      : undefined,
  });
  const reaper = startReaper(db, {
    lockTimeoutMs: config.lockTimeoutMs,
    maxRetries: config.maxRetries,
    intervalMs: config.reaperIntervalMs,
  });
  // The summarizer may run a different (typically cheaper) provider/model
  // than the main agent; empty settings inherit the agent's setup.
  const summarizerSetup = llmSetup === undefined ? undefined : (
    config.summarizerProvider === "" && config.summarizerModel === "" ? llmSetup : resolveLlmSetup({
      llmProvider: config.summarizerProvider === "" ? config.llmProvider : config.summarizerProvider,
      llmModel: config.summarizerModel,
      llmThinking: "off",
    })
  );
  const summarizer = config.memoryEnabled
    ? startSummarizer(db, {
      summarizeAfterMs: config.summarizeAfterMs,
      activeCap: config.memoryActiveCap,
      summarize: summarizerSetup !== undefined
        ? createLlmThreadSummarizer(summarizerSetup)
        : createEchoThreadSummarizer(),
    })
    : null;

  logger.info("engine_started", {
    pid: Deno.pid,
    logFile,
    databasePath: config.databasePath,
    agentMode: harness.mode,
    llmProvider: llmSetup?.provider ?? null,
    llmModel: llmSetup !== undefined ? (config.llmModel || "(provider default)") : null,
    llmThinking: llmSetup !== undefined ? config.llmThinking : null,
    workerConcurrency: config.workerConcurrency,
    pollIntervalMs: config.pollIntervalMs,
    maxRetries: config.maxRetries,
    lockTimeoutMs: config.lockTimeoutMs,
    reaperIntervalMs: config.reaperIntervalMs,
    devFaults: config.devFaults,
    memoryEnabled: config.memoryEnabled,
    summarizeAfterMs: config.summarizeAfterMs,
    summarizerProvider: summarizerSetup?.provider ?? null,
    summarizerModel: summarizerSetup?.modelId ?? null,
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("engine_stopping", { signal });
    await Promise.all([pool.stop(), reaper.stop(), summarizer?.stop() ?? Promise.resolve()]);
    db.close();
    logger.info("engine_stopped", {});
    teardownLogging();
    Deno.exit(0);
  };
  Deno.addSignalListener("SIGINT", () => void shutdown("SIGINT"));
  Deno.addSignalListener("SIGTERM", () => void shutdown("SIGTERM"));
}
