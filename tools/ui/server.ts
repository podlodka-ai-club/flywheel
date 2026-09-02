/**
 * Dev harness (never deployed): simulates the external support platform.
 * Runs as its own process against the shared SQLite file, exactly like a real
 * co-located ingest/dispatcher would (spec §3.2).
 */
import { join } from "node:path";
import { config } from "../../src/config.ts";
import { configureLogging, logger } from "../../src/logger/index.ts";
import { openDb } from "../../src/db/client.ts";
import { createConnectors } from "../../src/connectors/index.ts";
import {
  acknowledgeFailed,
  deleteThread,
  getMessage,
  getThreadMessages,
  insertCustomerMessage,
  insertSystemMessage,
  listThreads,
  listUnacknowledgedFailed,
  markDelivered,
} from "../../src/db/messages.ts";
import {
  archiveMemory,
  eraseCustomerMemories,
  listAllMemories,
  listMemoryCustomers,
} from "../../src/memory/store.ts";
import { parseEnvFile } from "./env_file.ts";

configureLogging({ name: "dev-ui" });
const db = openDb(config.databasePath);
const connectors = createConnectors();
const INDEX_HTML_URL = new URL("./index.html", import.meta.url);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

interface IngestPayload {
  threadId?: unknown;
  content?: unknown;
  customerId?: unknown;
  externalId?: unknown;
}

async function handleIngest(req: Request): Promise<Response> {
  let payload: IngestPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const threadId = typeof payload.threadId === "string" ? payload.threadId.trim() : "";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";
  const customerId = typeof payload.customerId === "string" && payload.customerId.trim() !== ""
    ? payload.customerId.trim()
    : "cust_anon";
  const externalId = typeof payload.externalId === "string" && payload.externalId.trim() !== ""
    ? payload.externalId.trim()
    : null;

  if (threadId === "" || content === "") {
    return json({ error: "threadId and content are required" }, 400);
  }

  const id = externalId ?? `ext_${crypto.randomUUID()}`;
  const { inserted } = insertCustomerMessage(db, {
    id,
    threadId,
    content,
    customerId,
    metadata: { channel: "dev-ui" },
  });

  logger.info("dev_ui_message_ingested", { threadId, messageId: id, inserted });
  return json({ id, inserted });
}

// ---- Raw table browser (Database view): any user table in the SQLite file ----

// Enum overlays the DDL can't express (they live in schema.sql comments):
// keep edited values inside the vocabularies the engine's queries rely on.
const TABLE_ENUMS: Record<string, Record<string, string[]>> = {
  messages: {
    status: ["pending", "processing", "completed", "failed"],
    role: ["customer", "assistant", "system"],
  },
  memories: {
    kind: ["fact", "episode", "playbook"],
    provenance: ["customer_stated", "agent_inferred", "ticket_summary", "human_resolution"],
  },
};

interface TableColumn {
  name: string;
  type: string;
  notNull: boolean;
  pk: boolean;
}

interface TableMeta {
  name: string;
  columns: TableColumn[];
  /** Single-column primary key; null makes the table read-only in the UI. */
  pk: string | null;
}

const quoteIdent = (name: string) => '"' + name.replaceAll('"', '""') + '"';

function listUserTables(): string[] {
  return db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).all().map((row) => (row as { name: string }).name);
}

function tableMeta(name: string): TableMeta | null {
  if (!listUserTables().includes(name)) return null;
  const columns = db.prepare(`PRAGMA table_info(${quoteIdent(name)})`).all()
    // deno-lint-ignore no-explicit-any
    .map((c: any) => ({
      name: String(c.name),
      type: String(c.type ?? "").toUpperCase(),
      notNull: Number(c.notnull) === 1,
      pk: Number(c.pk) > 0,
    }));
  const pkColumns = columns.filter((c) => c.pk);
  return { name, columns, pk: pkColumns.length === 1 ? pkColumns[0].name : null };
}

function handleDbTables(): Response {
  const tables = listUserTables().map((name) => {
    const { n } = db.prepare(`SELECT COUNT(*) AS n FROM ${quoteIdent(name)}`).get() as { n: number };
    return { name, rowCount: Number(n) };
  });
  return json(tables);
}

/**
 * Raw row browser: unmapped rows, snake_case and all, from any user table.
 * Filters arrive as repeatable eq=column:value params (equality, ANDed);
 * values are bound as text and SQLite's type affinity coerces per column.
 */
function handleDbRows(table: string, url: URL): Response {
  const meta = tableMeta(table);
  if (meta === null) {
    return json({ error: `unknown table: ${table}` }, 400);
  }
  const columnNames = new Set(meta.columns.map((c) => c.name));

  const where: string[] = [];
  const params: string[] = [];
  for (const eq of url.searchParams.getAll("eq")) {
    const i = eq.indexOf(":");
    const column = i === -1 ? eq : eq.slice(0, i);
    const value = i === -1 ? "" : eq.slice(i + 1);
    if (!columnNames.has(column)) {
      return json({ error: `unknown column in filter: ${column}` }, 400);
    }
    where.push(`${quoteIdent(column)} = ?`);
    params.push(value);
  }
  const limit = Math.min(1000, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "200", 10) || 200));

  const order = columnNames.has("created_at")
    ? "created_at DESC" + (meta.pk === null ? "" : `, ${quoteIdent(meta.pk)} DESC`)
    : meta.pk === null
    ? ""
    : `${quoteIdent(meta.pk)} ASC`;
  const sql = `SELECT * FROM ${quoteIdent(table)}` +
    (where.length > 0 ? " WHERE " + where.join(" AND ") : "") +
    (order === "" ? "" : ` ORDER BY ${order}`) +
    " LIMIT ?";
  const rows = db.prepare(sql).all(...params, limit);
  return json({ table, pk: meta.pk, readOnly: meta.pk === null, columns: meta.columns, rows });
}

/**
 * Raw cell editor: sets one column of one row in any user table. The value
 * arrives as the text the user typed (or null) and is coerced per the
 * column's declared type; TABLE_ENUMS keeps engine vocabularies intact.
 */
async function handleDbCellEdit(req: Request, table: string, id: string): Promise<Response> {
  const meta = tableMeta(table);
  if (meta === null) {
    return json({ error: `unknown table: ${table}` }, 400);
  }
  if (meta.pk === null) {
    return json({ error: `${table} has no single-column primary key — read-only` }, 400);
  }

  let payload: { column?: unknown; value?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const columnName = typeof payload.column === "string" ? payload.column : "";
  const column = meta.columns.find((c) => c.name === columnName);
  if (column === undefined) {
    return json({ error: `unknown column: ${columnName || "(missing)"}` }, 400);
  }
  if (column.pk) {
    return json({ error: `${column.name} is the primary key — not editable` }, 400);
  }
  const raw = payload.value;
  if (raw !== null && typeof raw !== "string") {
    return json({ error: "value must be a string or null" }, 400);
  }

  const declared = column.type;
  const kind = declared.includes("INT")
    ? "int"
    : /REAL|FLOA|DOUB|NUMERIC|DECIMAL/.test(declared)
    ? "real"
    : declared.includes("JSON")
    ? "json"
    : "text";

  let value: string | number | null;
  if (raw === null) {
    if (column.notNull) {
      return json({ error: `${column.name} is NOT NULL` }, 400);
    }
    value = null;
  } else if (kind === "int" || kind === "real") {
    const n = Number(raw.trim());
    if (raw.trim() === "" || !Number.isFinite(n) || (kind === "int" && !Number.isInteger(n))) {
      return json({ error: `${column.name} expects ${kind === "int" ? "an integer" : "a number"}` }, 400);
    }
    value = n;
  } else if (kind === "json") {
    try {
      JSON.parse(raw);
    } catch {
      return json({ error: `${column.name} must be valid JSON (or NULL)` }, 400);
    }
    value = raw;
  } else {
    value = raw;
  }

  const allowed = TABLE_ENUMS[table]?.[column.name];
  if (value !== null && allowed !== undefined && !allowed.includes(String(value))) {
    return json({ error: `${column.name} must be one of: ${allowed.join(", ")}` }, 400);
  }

  let updated: boolean;
  try {
    const result = db.prepare(
      `UPDATE ${quoteIdent(table)} SET ${quoteIdent(column.name)} = ? WHERE ${quoteIdent(meta.pk)} = ?`,
    ).run(value, id);
    updated = Number(result.changes) > 0;
  } catch (err) {
    // e.g. idx_messages_reply_once uniqueness — surface the SQLite message.
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
  if (!updated) {
    return json({ error: "row not found (deleted underneath you?)" }, 404);
  }
  logger.info("dev_ui_db_cell_edited", { table, rowId: id, column: column.name });
  return json({ updated });
}

function handleDbStats(): Response {
  const byStatus: Record<string, number> = { pending: 0, processing: 0, completed: 0, failed: 0 };
  let total = 0;
  for (const row of db.prepare("SELECT status, COUNT(*) AS n FROM messages GROUP BY status").all()) {
    // deno-lint-ignore no-explicit-any
    const { status, n } = row as any;
    byStatus[status] = Number(n);
    total += Number(n);
  }
  const journal = db.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
  let sizeBytes: number | null = null;
  try {
    sizeBytes = Deno.statSync(config.databasePath).size;
  } catch {
    // e.g. in-memory database
  }
  return json({
    databasePath: config.databasePath,
    journalMode: journal.journal_mode,
    sizeBytes,
    total,
    byStatus,
  });
}

const LOG_SOURCES = new Set(["engine", "dev-ui"]);
const LEVEL_ORDER: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_TAIL_BYTES = 512 * 1024;

async function readTail(path: string, maxBytes: number): Promise<string> {
  using file = await Deno.open(path, { read: true });
  const stat = await file.stat();
  const start = Math.max(0, stat.size - maxBytes);
  await file.seek(start, Deno.SeekMode.Start);
  const buffer = new Uint8Array(stat.size - start);
  let offset = 0;
  while (offset < buffer.length) {
    const n = await file.read(buffer.subarray(offset));
    if (n === null) break;
    offset += n;
  }
  let text = new TextDecoder().decode(buffer.subarray(0, offset));
  // Drop the first (possibly partial) line when we started mid-file.
  if (start > 0) text = text.slice(text.indexOf("\n") + 1);
  return text;
}

/**
 * Logs view backend: tails a process log file and filters server-side.
 * "Per-thread logs" are a filter over the structured threadId field —
 * one source of truth, no per-thread file sprawl.
 */
async function handleLogs(url: URL): Promise<Response> {
  const source = url.searchParams.get("source") ?? "engine";
  if (!LOG_SOURCES.has(source)) {
    return json({ error: `unknown source; expected one of: ${[...LOG_SOURCES].join(", ")}` }, 400);
  }
  const minLevel = LEVEL_ORDER[url.searchParams.get("minLevel") ?? "debug"] ?? 0;
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const thread = (url.searchParams.get("thread") ?? "").trim();
  const limit = Math.min(2000, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "300", 10) || 300));

  const path = join(config.logDir, `${source}.log`);
  let raw: string;
  let sizeBytes: number;
  try {
    sizeBytes = (await Deno.stat(path)).size;
    raw = await readTail(path, LOG_TAIL_BYTES);
  } catch {
    return json({ entries: [], sizeBytes: 0, missing: true, path });
  }

  const lines = raw.split("\n");
  const entries: unknown[] = [];
  for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
    const line = lines[i].trim();
    if (line === "") continue;
    if (q !== "" && !line.toLowerCase().includes(q)) continue;
    // deno-lint-ignore no-explicit-any
    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      entry = { level: "info", event: "unparsed_line", raw: line };
    }
    if ((LEVEL_ORDER[entry.level] ?? 1) < minLevel) continue;
    if (thread !== "" && entry.threadId !== thread) continue;
    entries.push(entry);
  }
  entries.reverse();
  return json({ entries, sizeBytes, missing: false, path });
}

// ---- Config view: every config option's default next to what the .env file
// ---- sets. The file is parsed as TEXT for display only — never loaded into
// ---- this process's environment. API keys are reported presence-only.

const ENV_FILE_PATH = "./.env";

// Anything credential-shaped is masked by NAME, so no fixed list can miss one.
const SECRET_ENV_RE = /API_KEY|SECRET|TOKEN|PASSWORD/i;

// Mirrors PROVIDER_KEY_ENVS in src/agent/harness.ts — not imported, because
// pulling the pi SDK into this process would break dev:ui's strict --allow-env.
const PROVIDER_KEY_ENVS: Record<string, string> = {
  openrouter: "OPENROUTER_API_KEY",
  google: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

// Every config var with its default as a display string. Kept in sync with
// loadConfig() in src/config.ts and the README env tables.
const CONFIG_VARS: { env: string; default: string; section: string; note?: string }[] = [
  { env: "AGENT_MODE", default: "llm", section: "LLM & agent", note: "echo = deterministic replies, no key needed" },
  { env: "LLM_PROVIDER", default: "openrouter", section: "LLM & agent" },
  { env: "LLM_MODEL", default: "", section: "LLM & agent", note: "empty = the provider's default model" },
  { env: "LLM_THINKING", default: "off", section: "LLM & agent", note: "auto-clamped per model at runtime" },
  { env: "MEMORY_ENABLED", default: "1", section: "Memory" },
  { env: "SUMMARIZE_AFTER_MS", default: "86400000", section: "Memory", note: "idle time before a terminal thread summarizes" },
  { env: "SUMMARIZER_PROVIDER", default: "", section: "Memory", note: "empty = inherit the agent's" },
  { env: "SUMMARIZER_MODEL", default: "", section: "Memory", note: "empty = inherit the agent's" },
  { env: "MEMORY_HYDRATION_BUDGET", default: "1200", section: "Memory", note: "approx. tokens of memories in the system prompt" },
  { env: "MEMORY_RUN_WRITE_CAP", default: "3", section: "Memory", note: "max memory writes per agent run" },
  { env: "MEMORY_ACTIVE_CAP", default: "200", section: "Memory", note: "max active memories per customer" },
  { env: "DATABASE_PATH", default: "./data/support.db", section: "Queue & engine" },
  { env: "WORKER_CONCURRENCY", default: "2", section: "Queue & engine" },
  { env: "POLL_INTERVAL_MS", default: "500", section: "Queue & engine" },
  { env: "LOCK_TIMEOUT_MS", default: "600000", section: "Queue & engine", note: "lease lifetime; set above worst-case agent runtime" },
  { env: "MAX_RETRIES", default: "3", section: "Queue & engine" },
  { env: "REAPER_INTERVAL_MS", default: "5000", section: "Queue & engine", note: "auto-clamped to ≤ half the lease" },
  { env: "KNOWLEDGE_BASE_PATH", default: "./wiki", section: "Knowledge base", note: "directory containing the Markdown wiki" },
  { env: "KNOWLEDGE_BASE_RELOAD", default: "0", section: "Knowledge base", note: "1 = reload changed Markdown before a search" },
  { env: "LOG_LEVEL", default: "info", section: "Logging" },
  { env: "LOG_DIR", default: "./data/logs", section: "Logging" },
  { env: "LOG_MAX_BYTES", default: "5242880", section: "Logging", note: "rotation threshold per file" },
  { env: "LOG_BACKUP_COUNT", default: "3", section: "Logging" },
  { env: "DEV_UI_PORT", default: "8787", section: "Dev harness", note: "PORT (e.g. from a preview runner) wins over it" },
  { env: "DEV_FAULTS", default: "0", section: "Dev harness", note: "[[sleep]]/[[fail]] markers, echo mode only" },
];

async function handleConfig(): Promise<Response> {
  let entries: Map<string, string> | null = null;
  let envError: string | null = null;
  try {
    entries = parseEnvFile(await Deno.readTextFile(ENV_FILE_PATH));
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      envError = "cannot read ./.env — is it in dev:ui --allow-read (deno.json)?";
    }
  }

  const vars = CONFIG_VARS.map(({ env, default: def, section, note }) => ({
    env,
    section,
    note: note ?? null,
    default: def,
    actual: entries?.get(env) ?? null,
  }));

  // Which provider key the configured (or default) LLM_PROVIDER needs.
  const provider = entries?.get("LLM_PROVIDER") ?? "openrouter";
  const activeKeyEnv = PROVIDER_KEY_ENVS[provider] ??
    `${provider.toUpperCase().replaceAll("-", "_")}_API_KEY`;
  const keyEnvs = new Map<string, string>();
  for (const [p, env] of Object.entries(PROVIDER_KEY_ENVS)) keyEnvs.set(env, p);
  if (!keyEnvs.has(activeKeyEnv)) keyEnvs.set(activeKeyEnv, provider);
  const keys = [...keyEnvs].map(([env, p]) => ({
    env,
    provider: p,
    active: env === activeKeyEnv,
    set: (entries?.get(env) ?? "") !== "",
  }));

  // Entries in .env that match no known variable — typos surface here.
  // Credential-looking names stay presence-only.
  const known = new Set([...CONFIG_VARS.map((v) => v.env), ...keyEnvs.keys()]);
  const extras = [...(entries ?? [])]
    .filter(([name]) => !known.has(name))
    .map(([name, value]) => {
      const secret = SECRET_ENV_RE.test(name);
      return { name, secret, value: secret ? null : value };
    });

  return json({
    envFile: { path: ENV_FILE_PATH, found: entries !== null, count: entries?.size ?? 0, error: envError },
    vars,
    keys,
    extras,
  });
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;

  if (req.method === "GET" && pathname === "/") {
    return new Response(await Deno.readTextFile(INDEX_HTML_URL), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (req.method === "GET" && pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }
  if (req.method === "GET" && pathname === "/api/threads") {
    return json(listThreads(db));
  }
  const threadMessages = pathname.match(/^\/api\/threads\/([^/]+)\/messages$/);
  if (req.method === "GET" && threadMessages) {
    return json(getThreadMessages(db, decodeURIComponent(threadMessages[1])));
  }
  const threadDelete = pathname.match(/^\/api\/threads\/([^/]+)$/);
  if (req.method === "DELETE" && threadDelete) {
    const threadId = decodeURIComponent(threadDelete[1]);
    const deleted = deleteThread(db, threadId);
    logger.info("dev_ui_thread_deleted", { threadId, deleted });
    return json({ deleted });
  }
  if (req.method === "POST" && pathname === "/api/messages") {
    return await handleIngest(req);
  }
  const deliveredMatch = pathname.match(/^\/api\/messages\/([^/]+)\/delivered$/);
  if (req.method === "POST" && deliveredMatch) {
    const id = decodeURIComponent(deliveredMatch[1]);
    const delivered = markDelivered(db, id, Date.now());
    if (delivered) {
      logger.info("dev_ui_reply_delivered", { messageId: id, threadId: getMessage(db, id)?.threadId });
    }
    return json({ delivered });
  }
  if (req.method === "GET" && pathname === "/api/failed") {
    return json(listUnacknowledgedFailed(db));
  }
  if (req.method === "GET" && pathname === "/api/customers") {
    // Composer identity picker: the customer directory from the CRM connector.
    const customers = await connectors.crm.listCustomers();
    return json(customers.map((c) => ({ id: c.customerId, company: c.company, plan: c.plan })));
  }
  const failedAckMatch = pathname.match(/^\/api\/messages\/([^/]+)\/failed_ack$/);
  if (req.method === "POST" && failedAckMatch) {
    const id = decodeURIComponent(failedAckMatch[1]);
    const acknowledged = acknowledgeFailed(db, id, Date.now());
    if (acknowledged) {
      logger.info("dev_ui_failed_acknowledged", { messageId: id, threadId: getMessage(db, id)?.threadId });
    }
    return json({ acknowledged });
  }
  if (req.method === "GET" && pathname === "/api/logs") {
    return await handleLogs(url);
  }
  if (req.method === "GET" && pathname === "/api/config") {
    return await handleConfig();
  }
  if (req.method === "GET" && pathname === "/api/db/stats") {
    return handleDbStats();
  }
  if (req.method === "GET" && pathname === "/api/db/tables") {
    return handleDbTables();
  }
  const dbRows = pathname.match(/^\/api\/db\/([^/]+)$/);
  if (req.method === "GET" && dbRows) {
    return handleDbRows(decodeURIComponent(dbRows[1]), url);
  }
  const dbCellEdit = pathname.match(/^\/api\/db\/([^/]+)\/([^/]+)$/);
  if (req.method === "PATCH" && dbCellEdit) {
    return await handleDbCellEdit(req, decodeURIComponent(dbCellEdit[1]), decodeURIComponent(dbCellEdit[2]));
  }

  // ---- Per-customer memory (spec §10): audit surface + erasure + simulation
  if (req.method === "GET" && pathname === "/api/memory/customers") {
    return json(listMemoryCustomers(db));
  }
  if (req.method === "GET" && pathname === "/api/memory") {
    const customerId = (url.searchParams.get("customer") ?? "").trim();
    if (customerId === "") return json({ error: "customer query param required" }, 400);
    return json(listAllMemories(db, customerId));
  }
  if (req.method === "DELETE" && pathname === "/api/memory") {
    const customerId = (url.searchParams.get("customer") ?? "").trim();
    if (customerId === "") return json({ error: "customer query param required" }, 400);
    const erased = eraseCustomerMemories(db, customerId);
    logger.info("dev_ui_memories_erased", { customerId, erased });
    return json({ erased });
  }
  const memoryArchive = pathname.match(/^\/api\/memory\/([^/]+)\/archive$/);
  if (req.method === "POST" && memoryArchive) {
    const body = await req.json().catch(() => ({}));
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    if (customerId === "") return json({ error: "customerId required" }, 400);
    const archived = archiveMemory(db, customerId, decodeURIComponent(memoryArchive[1]));
    if (archived) {
      logger.info("dev_ui_memory_archived", {
        customerId,
        memoryId: decodeURIComponent(memoryArchive[1]),
      });
    }
    return json({ archived });
  }
  const humanResolution = pathname.match(/^\/api\/threads\/([^/]+)\/human_resolution$/);
  if (req.method === "POST" && humanResolution) {
    const threadId = decodeURIComponent(humanResolution[1]);
    const body = await req.json().catch(() => ({}));
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (content === "") return json({ error: "content required" }, 400);
    const customerId = getThreadMessages(db, threadId)
      .find((m) => m.customerId !== null)?.customerId ?? null;
    const row = insertSystemMessage(db, {
      threadId,
      content,
      customerId,
      metadata: { type: "human_resolution", channel: "dev-ui" },
    });
    logger.info("dev_ui_human_resolution_inserted", { threadId, messageId: row.id, customerId });
    return json({ id: row.id });
  }

  return json({ error: "not found" }, 404);
}

// PORT (when set, e.g. by a preview runner) wins over DEV_UI_PORT so several
// harness instances can watch the same database side by side.
const port = Number.parseInt(Deno.env.get("PORT") ?? "", 10) || config.devUiPort;

Deno.serve({
  hostname: "127.0.0.1",
  port,
  onListen: ({ hostname, port }) => {
    logger.info("dev_ui_listening", { url: `http://${hostname}:${port}`, databasePath: config.databasePath });
  },
}, handler);
