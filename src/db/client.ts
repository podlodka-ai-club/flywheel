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
  migrate(db);
  db.exec(Deno.readTextFileSync(SCHEMA_URL));
  return db;
}

/**
 * Additive migrations for databases created by earlier schema versions —
 * must run before schema.sql, whose indexes may reference the new columns.
 */
function migrate(db: DatabaseSync): void {
  const hasTable = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'messages'",
  ).get();
  if (hasTable === undefined) return;
  const columns = db.prepare("PRAGMA table_info(messages)")
    // deno-lint-ignore no-explicit-any
    .all().map((c: any) => c.name as string);
  if (!columns.includes("customer_id")) {
    db.exec("ALTER TABLE messages ADD COLUMN customer_id TEXT");
  }
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
