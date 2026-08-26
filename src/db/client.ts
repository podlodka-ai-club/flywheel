import { DatabaseSync } from "node:sqlite";
import { dirname } from "node:path";

const SCHEMA_URL = new URL("../../schema.sql", import.meta.url);

/**
 * Opens (creating if necessary) the SQLite database at `path` and applies
 * schema.sql. The schema file starts with the per-connection PRAGMAs
 * (busy_timeout, synchronous) and uses IF NOT EXISTS DDL throughout, so
 * running it on every open is both required and idempotent.
 */
export function openDb(path: string): DatabaseSync {
  if (path !== ":memory:") {
    Deno.mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec(Deno.readTextFileSync(SCHEMA_URL));
  return db;
}

if (import.meta.main) {
  const { config } = await import("../config.ts");
  const { logger } = await import("../logger/index.ts");
  const db = openDb(config.databasePath);
  const journalMode = db.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
  db.close();
  logger.info("db_initialized", {
    databasePath: config.databasePath,
    journalMode: journalMode.journal_mode,
  });
}
