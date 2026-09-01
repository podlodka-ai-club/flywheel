/**
 * Engine entrypoint (`deno task start`): the long-running process that turns
 * pending customer messages into completed replies. Wires config, logging,
 * the SQLite store, the agent harness (echo or LLM), the memory strategy
 * (MEMORY_STRATEGY, or `deno task start --memory=<name>`) with its
 * background jobs, the worker pool, and the zombie-lease reaper together,
 * logs the resolved runtime settings, and shuts everything down gracefully
 * on SIGINT/SIGTERM.
 */
import { config } from "./config.ts";
import { configureLogging, logger, teardownLogging } from "./logger/index.ts";
import { openDb } from "./db/client.ts";
import { createHarness, resolveLlmSetup } from "./agent/harness.ts";
import { startReaper } from "./engine/reaper.ts";
import { startWorkers } from "./engine/worker.ts";
import { createMemoryStrategy } from "./memory/registry.ts";

if (import.meta.main) {
  const logFile = configureLogging({ name: "engine" });
  const db = openDb(config.databasePath);
  const llmSetup = config.agentMode === "llm" ? resolveLlmSetup(config) : undefined;
  const harness = createHarness(config.agentMode, {
    devFaults: config.devFaults,
    llm: llmSetup,
  });
  // MEMORY_ENABLED is the master switch; MEMORY_STRATEGY / --memory picks the
  // implementation. An unknown name fails here, before any message is claimed.
  const memory = config.memoryEnabled
    ? createMemoryStrategy(config.memoryStrategy, { db, config, llm: llmSetup })
    : null;
  const pool = startWorkers(db, harness, {
    workerConcurrency: config.workerConcurrency,
    pollIntervalMs: config.pollIntervalMs,
    maxRetries: config.maxRetries,
    memory: memory ?? undefined,
  });
  const reaper = startReaper(db, {
    lockTimeoutMs: config.lockTimeoutMs,
    maxRetries: config.maxRetries,
    intervalMs: config.reaperIntervalMs,
  });
  // Strategy-owned background work, e.g. the structured strategy's
  // end-of-ticket summarizer (which may run a cheaper model than the agent).
  const memoryJobs = memory?.startJobs() ?? null;

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
    memoryStrategy: memory?.name ?? null,
    ...(memory?.describe() ?? {}),
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("engine_stopping", { signal });
    await Promise.all([pool.stop(), reaper.stop(), memoryJobs?.stop() ?? Promise.resolve()]);
    db.close();
    logger.info("engine_stopped", {});
    teardownLogging();
    Deno.exit(0);
  };
  Deno.addSignalListener("SIGINT", () => void shutdown("SIGINT"));
  Deno.addSignalListener("SIGTERM", () => void shutdown("SIGTERM"));
}
