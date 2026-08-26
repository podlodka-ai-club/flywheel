import { config } from "./config.ts";
import { logger } from "./logger/index.ts";
import { openDb } from "./db/client.ts";
import { createHarness } from "./agent/harness.ts";
import { startWorkers } from "./engine/worker.ts";

if (import.meta.main) {
  const db = openDb(config.databasePath);
  const harness = createHarness(config.agentMode);
  const pool = startWorkers(db, harness, {
    workerConcurrency: config.workerConcurrency,
    pollIntervalMs: config.pollIntervalMs,
    maxRetries: config.maxRetries,
  });

  logger.info("engine_started", {
    databasePath: config.databasePath,
    agentMode: harness.mode,
    workerConcurrency: config.workerConcurrency,
    pollIntervalMs: config.pollIntervalMs,
    maxRetries: config.maxRetries,
    lockTimeoutMs: config.lockTimeoutMs,
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("engine_stopping", { signal });
    await pool.stop();
    db.close();
    logger.info("engine_stopped", {});
    Deno.exit(0);
  };
  Deno.addSignalListener("SIGINT", () => void shutdown("SIGINT"));
  Deno.addSignalListener("SIGTERM", () => void shutdown("SIGTERM"));
}
