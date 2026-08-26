/**
 * Dev harness (never deployed): simulates the external support platform.
 * Runs as its own process against the shared SQLite file, exactly like a real
 * co-located ingest/dispatcher would (spec §3.2).
 */
import { config } from "../../src/config.ts";
import { logger } from "../../src/logger/index.ts";
import { openDb } from "../../src/db/client.ts";
import { getThreadMessages, insertCustomerMessage, listThreads } from "../../src/db/messages.ts";

const db = openDb(config.databasePath);
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
    metadata: { customerId, channel: "dev-ui" },
  });

  logger.info("dev_ui_message_ingested", { threadId, messageId: id, inserted });
  return json({ id, inserted });
}

const DB_FILTER_STATUSES = new Set(["pending", "processing", "completed", "failed"]);
const DB_FILTER_ROLES = new Set(["customer", "assistant", "system"]);

/** Raw table browser for the Database view: unmapped rows, snake_case and all. */
function handleDbMessages(url: URL): Response {
  const where: string[] = [];
  const params: (string | number)[] = [];

  const status = url.searchParams.get("status") ?? "";
  if (status !== "" && DB_FILTER_STATUSES.has(status)) {
    where.push("status = ?");
    params.push(status);
  }
  const role = url.searchParams.get("role") ?? "";
  if (role !== "" && DB_FILTER_ROLES.has(role)) {
    where.push("role = ?");
    params.push(role);
  }
  const thread = (url.searchParams.get("thread") ?? "").trim();
  if (thread !== "") {
    where.push("thread_id = ?");
    params.push(thread);
  }
  const limit = Math.min(1000, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "200", 10) || 200));

  const sql = "SELECT * FROM messages" +
    (where.length > 0 ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY created_at DESC, id DESC LIMIT ?";
  params.push(limit);
  return json(db.prepare(sql).all(...params));
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
  if (req.method === "POST" && pathname === "/api/messages") {
    return await handleIngest(req);
  }
  if (req.method === "GET" && pathname === "/api/db/messages") {
    return handleDbMessages(url);
  }
  if (req.method === "GET" && pathname === "/api/db/stats") {
    return handleDbStats();
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
