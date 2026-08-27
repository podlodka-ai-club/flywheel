import { config } from "./config.ts";
import { configureLogging, logger, teardownLogging } from "./logger/index.ts";
import { openDb } from "./db/client.ts";
import { createHarness, resolveLlmSetup } from "./agent/harness.ts";
import { startReaper } from "./engine/reaper.ts";
import { startWorkers } from "./engine/worker.ts";

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
  });
  const reaper = startReaper(db, {
    lockTimeoutMs: config.lockTimeoutMs,
    maxRetries: config.maxRetries,
    intervalMs: config.reaperIntervalMs,
  });

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
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("engine_stopping", { signal });
    await Promise.all([pool.stop(), reaper.stop()]);
    db.close();
    logger.info("engine_stopped", {});
    teardownLogging();
    Deno.exit(0);
  };
  Deno.addSignalListener("SIGINT", () => void shutdown("SIGINT"));
  Deno.addSignalListener("SIGTERM", () => void shutdown("SIGTERM"));
}
