/**
 * Engine entrypoint (`deno task start`): the long-running process that turns
 * pending customer messages into completed replies. Wires config, logging,
 * the SQLite store, the agent harness (echo or LLM), the memory strategy
 * (MEMORY_STRATEGY, or `deno task start --memory=<name>`) and the memory
 * runtime that drives its jobs and event handler, the worker pool, and the
 * zombie-lease reaper together, logs the resolved runtime settings, and
 * shuts everything down gracefully on SIGINT/SIGTERM.
 */
import { config } from "./config.ts";
import { configureLogging, logger, teardownLogging } from "./logger/index.ts";
import { openDb } from "./db/client.ts";
import { createHarness, resolveLlmSetup } from "./agent/harness.ts";
import { startReaper } from "./engine/reaper.ts";
import { startWorkers } from "./engine/worker.ts";
import { createMemoryStrategy } from "./memory/registry.ts";
import { startMemoryRuntime } from "./memory/runtime.ts";

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
  // The memory runtime drives the strategy's asynchronous ports: its declared
  // jobs (e.g. the structured strategy's idle-sweep summarizer) and the bus
  // tail that turns new rows into events for its handler (e.g. ticket_closed).
  const memoryRuntime = memory === null
    ? null
    : startMemoryRuntime(db, memory, { eventPollMs: config.memoryEventPollMs });

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
    memoryJobs: memory?.jobs?.map((job) => job.name) ?? [],
    memoryEvents: memory?.events?.types ?? [],
    memoryEventPollMs: memory === null ? null : config.memoryEventPollMs,
    ...(memory?.describe() ?? {}),
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("engine_stopping", { signal });
    await Promise.all([pool.stop(), reaper.stop(), memoryRuntime?.stop() ?? Promise.resolve()]);
    db.close();
    logger.info("engine_stopped", {});
    teardownLogging();
    Deno.exit(0);
  };
  Deno.addSignalListener("SIGINT", () => void shutdown("SIGINT"));
  Deno.addSignalListener("SIGTERM", () => void shutdown("SIGTERM"));
}
