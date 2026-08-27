# Implementation Milestones

Six milestones, each ending in something runnable that you verify by hand before we continue. Milestones 1–3 require **no LLM API key**: the engine runs with a deterministic echo agent so all queue mechanics can be exercised for free. The real agent arrives in Milestone 4.

Testing happens through a **dev web harness** (`tools/ui/`) that simulates the external support platform — ingest and dispatcher — which is out of scope for the core per [specification.md](specification.md) §3.2. It is a separate Deno process from the engine, sharing the SQLite file just like a real co-located adapter would, so every test session also exercises the multi-process WAL contract. No frontend framework, no build step: one `Deno.serve` server with a thin JSON API over the data-access layer, serving a single static HTML page (vanilla JS, ~1s polling).

Your testing loop: `deno task start` (engine) in one terminal, `deno task dev:ui` in another, browser at `http://localhost:8787`. Engine logs stay in the engine terminal — the UI shows conversation/queue state, the terminal shows the structured JSON traces.

**Working agreement:** after each milestone the work stops, you run the "You verify" list, and we proceed (or adjust) on your OK.

---

## M1 — Data layer & platform simulator (web harness v1)

**Goal:** the SQLite foundation plus the web harness acting as the external platform's ingest side.

**Build:**
- `schema.sql` exactly as specified (incl. `in_reply_to` and all four indexes)
- `src/config.ts` (env-driven: `DATABASE_PATH`, `LOCK_TIMEOUT_MS`, `MAX_RETRIES`, …)
- `src/logger/index.ts` (single-line JSON to stdout)
- `src/db/client.ts` (connection + PRAGMAs), `src/db/messages.ts` (data access layer)
- Dev web harness (`tools/ui/server.ts` + `tools/ui/index.html`) on `localhost:8787`:
  - thread list + conversation view with message statuses, polling live
  - composer: send as customer (thread id, customer id, optional external message id)
  - a "↻ redeliver" button on customer messages that re-POSTs with the same external id (simulates webhook redelivery)
  - JSON API: `GET /api/threads`, `GET /api/threads/:id/messages`, `POST /api/messages` (`INSERT OR IGNORE`)
- Tasks: `deno task db:init`, `deno task dev:ui`
- **Database view** (added on request): read-only raw `messages` table browser in the harness — every technical column (locking, attempts, telemetry, timestamps), status/role/thread filters, click a row for the full record as JSON, stats bar with row counts / WAL mode / file size, pause toggle for inspection

**You verify:**
1. `deno task db:init` creates the DB; running it twice is harmless.
2. In the browser: create a thread, send messages as the customer → they appear as `pending` in the conversation view.
3. Hit "↻ redeliver" on a message → no duplicate row appears (primary-key dedup).
4. With no engine running, messages just sit `pending` — statuses are honest.

**Automated tests:** DAL round-trip, idempotent init, primary-key dedup.

---

## M2 — End-to-end echo pipeline

**Goal:** the full lifecycle running — claim → process → fenced completion → dispatch — with a deterministic echo agent instead of an LLM.

**Build:**
- `src/db/queue.ts`: atomic claim (spec §4.1), fenced completion transaction writing `in_reply_to` (spec §4.4), release-claims helper
- `src/engine/worker.ts`: poll loop, N concurrent workers (`WORKER_CONCURRENCY`)
- Agent harness interface with the echo implementation (`AGENT_MODE=echo` replies `ECHO: <text>`)
- `src/main.ts` entrypoint → `deno task start`
- Harness dispatcher side: the UI shows assistant replies as they complete, stamps `sent_to_customer_at` when it renders one (`POST /api/messages/:id/delivered`), and marks it with a "delivered" tick
- Message detail view: status transitions, `worker_id`, `attempt_count`, `in_reply_to`

**You verify:**
1. Engine in one terminal, browser open: every message you send gets `ECHO: <text>` back in about a second, with a delivered tick.
2. Clicking a reply shows `in_reply_to` pointing at your message; the customer row shows `completed`.
3. Two threads chatting in parallel don't block each other.

**Automated tests:** concurrent claim (no double-claim; per-thread serialization holds), fenced completion, happy-path worker loop.

---

## M3 — Failure handling, recovery & coalescing

**Goal:** the engine survives crashes with no duplicate replies, no stuck messages, and no silent failures — and rapid-fire customer messages produce one consolidated reply.

**Build:**
- `src/engine/reaper.ts`: stale-lease recovery, `MAX_RETRIES` → `failed` marking (spec §4.2)
- Pre-commit freshness check & reply coalescing (spec §4.3)
- Fault injection **in the echo agent only**, enabled by `DEV_FAULTS=1`: `[[sleep:ms]]` delays every attempt, `[[sleep_once:ms]]` delays only the first attempt (so recovery demos end in a reply instead of retry starvation), `[[fail]]` throws
- Harness: a **Failed messages** panel (polls `idx_messages_failed` like a real platform would) with a "Route to human" button that stamps the acknowledgment; attempt counters visible on messages
- `customer_id` as a first-class column (added on request, for B2B memory later): propagated ingest → customer row → reply row → agent input; `idx_messages_customer`; additive migration for existing DBs

**You verify (all from the browser; engine in its own terminal, started as:**
`AGENT_MODE=echo DEV_FAULTS=1 LOCK_TIMEOUT_MS=6000 REAPER_INTERVAL_MS=1000 deno task start`
**— `AGENT_MODE=echo` matters since M4 made `llm` the default and fault markers are echo-only):**
1. **Crash recovery:** send `[[sleep_once:20000]] hello`, `kill -9` the engine while it sleeps (`engine_started` logs its pid), restart it → within ~7s the reaper reclaims the orphaned lease and the instant retry produces exactly one reply.
2. **Reaped while alive:** send `[[sleep_once:10000]] race` — at ~6s the reaper reclaims the lease while worker A still sleeps; worker B's instant retry replies (exactly one reply in the UI); at ~10s worker A wakes and logs `reply_discarded_lost_lease`.
3. **Coalescing:** send `[[sleep:4000]] first`, then two follow-ups during the sleep → ONE consolidated reply `ECHO: [[sleep:4000]] first | second | third` (each regeneration re-applies the sleep, so allow ~8–12s).
4. **Failure surfacing:** send `[[fail]] test` → three fast attempts → message lands in the ⚠ Failed panel with its error → "Route to human" acknowledges it (stamps `sent_to_customer_at`).

**Automated tests:** reaper reclaim, retry exhaustion → failed, duplicate-reply race (fence + `UNIQUE(in_reply_to)` backstop), coalescing, fault markers, customer-id propagation.

---

## M3.5 — Structured logging & Logs view (added on request)

**Goal:** detailed logging on Deno's standard `@std/log` — console + rotating files — and a Logs view in the harness for debugging.

**Build:**
- [src/logger/index.ts](src/logger/index.ts) rebuilt on `@std/log`: console handler + `RotatingFileHandler`, identical single-line JSON (spec §7 format) in both sinks, flushed per event
- Per-process files under `LOG_DIR` (default `./data/logs/`): `engine.log`, `dev-ui.log` — rotation (`LOG_MAX_BYTES` 5 MB × `LOG_BACKUP_COUNT` 3) never races across processes
- **Per-thread logs as a view, not files**: every event carries `threadId`, so the harness filters one source of truth (per-thread files would sprawl unboundedly; a per-thread export can be added later if a ticket's trace ever needs attaching)
- Harness **Logs view**: source (engine/dev-ui), min level, threadId, text search, follow mode; plus a "🪵 logs for this thread" jump from any conversation
- `GET /api/logs` endpoint (tails the file server-side, filters, caps at the last 512 KB)

**You verify:**
1. Run engine + harness, chat a bit → `data/logs/engine.log` and `dev-ui.log` exist and grow; console output unchanged.
2. Logs view shows engine events live (claim/complete with worker ids and durations); switching source shows the harness's own ingest/delivery events.
3. Open a thread → "🪵 logs for this thread" → Logs view pre-filtered to exactly that conversation's trace.
4. Filters work: level `warn +` shows only reaper/fence warnings; text search matches.
5. (Optional) rotation: `LOG_MAX_BYTES=2000 deno task start`, chat until `engine.log.1` appears.

**Automated tests:** JSON line shape in the file sink, size rotation producing numbered backups, teardown detaching the file cleanly.

---

## M4 — Real AI agent (pi.dev)

**Goal:** swap echo for the real LLM agent: pi-ai gateway, pi-agent-core loop, thread hydration, telemetry. Requires an LLM API key.

**Configuration** (the `start` task auto-loads `.env`; put keys there, never in chat/commits):
- `LLM_PROVIDER` — `openrouter` (default, uses `OPENROUTER_API_KEY`) or `google` (uses `GEMINI_API_KEY`); other pi-ai providers work via their conventional `<PROVIDER>_API_KEY`
- `LLM_MODEL` — empty = provider default: `openai/gpt-4o-mini` on OpenRouter, `gemini-2.5-flash` on Google
- `LLM_THINKING` — requested reasoning level, default `off`, auto-clamped to the model's catalog capabilities; when the live endpoint still rejects with "reasoning is mandatory" (catalog lag), the harness bumps a level, retries, and memoizes for the rest of the engine's lifetime
- `AGENT_MODE` — now defaults to `llm`; `echo` remains for key-free testing (fault markers still echo-only)
- Missing key → the engine fails fast at startup with the exact fix in the error message

**Build:**
- `src/agent/harness.ts`: real implementation via `@earendil-works/pi-agent-core` + `@earendil-works/pi-ai` — fresh `Agent` per run, seeded with hydrated history, prompted with the anchor + coalesced follow-ups as separate user turns; provider errors throw so the worker retry/fail path engages
- `src/agent/hydrator.ts`: completed thread rows → agent conversation turns (assistant turns synthesized provider-agnostically, so echo-era and cross-model history stays valid)
- `src/agent/prompt.ts`: B2B support system prompt (verified customer identity, honesty rules, prompt-injection stance, coalesced-messages rule)
- Telemetry: `model` (`provider:model_id`), `tokens_in`/`tokens_out`, `cost_usd` on reply rows; `message_completed` log events carry them
- Harness UI: telemetry chip on reply bubbles (model · tokens in→out · cost)
- Engine task: loads `.env`, network allowlist pinned to `openrouter.ai` + `generativelanguage.googleapis.com`; `--allow-env`/`--allow-sys` are broad for the engine only (the LLM SDK probes env/system metadata dynamically — file/network scopes stay strict)

**You verify:**
1. Put your key in `.env`, run `deno task start` + `deno task dev:ui` → ask a real question in the browser, get a real support-style answer (thread `tkt_m4_live` holds the first live conversation from my verification).
2. A follow-up like "what did I just ask you?" proves thread memory via hydration.
3. Reply bubbles show model/tokens/cost; `message_completed` in the Logs view carries the same numbers.
4. `AGENT_MODE=echo deno task start` still works — free regression testing forever after.

**Automated tests:** hydration mapping; LLM harness against pi-ai's faux provider (no network): reply + telemetry mapping, full context assembly (system prompt, history, anchor, follow-ups), provider-error → retry path.

---

## M5 — Support tools & escalation

**Goal:** the four support tools running against local JSON fixtures, with customer scoping and the escalation contract.

**Build:**
- `src/agent/tools/`: registry, `knowledge_base.ts`, `orders.ts` (orders + customer account), `escalation.ts`
- `fixtures/`: KB articles, orders, customers
- Authorization scoping: lookups bound to the verified customer identity in `ToolContext.metadata` (spec §6.1)
- `escalate_to_human` → customer-safe `content` + `metadata.escalated`/`escalation_reason`
- Harness: a customer selector (fixture customers) on the composer; escalated replies rendered with a distinct badge + reason; `tool_executed` structured logs with durations in the engine terminal

**You verify:**
1. Pick fixture customer `cust_1`, ask "where's my order ORD-1001?" → reply contains the fixture's tracking data; the engine terminal logs `tool_executed`.
2. Ask about an order belonging to a different fixture customer → the agent declines (scoping works).
3. "I need to talk to a human" → reply appears with the escalation badge and reason; content is customer-safe only.
4. A policy question ("what's your return window?") → answer grounded in the fixture KB article.

**Automated tests:** each tool, scoping enforcement, escalation metadata shape.

---

## M6 — Hardening & operations

**Goal:** production posture — clean shutdown, locked-down permissions, maintenance, docs, and a full end-to-end suite.

**Build:**
- Graceful shutdown: on SIGINT/SIGTERM stop claiming, finish or release in-flight work, exit
- Hourly `wal_checkpoint(TRUNCATE)` maintenance task (spec §9.2)
- `deno task start` runs under the exact least-privilege permission set from spec §9.1 (the dev harness keeps its own dev-only permissions and is never deployed with the engine)
- README run book: all tasks, env vars, the table contract for future adapter authors, and the harness guide
- End-to-end test covering the full lifecycle including failure and escalation paths

**You verify:**
1. Ctrl-C mid-conversation → no rows stuck in `processing`; restart resumes cleanly.
2. The engine fails fast with clear errors when env/permissions are missing.
3. `deno task test` is green across the entire suite.

---

## Beyond M6 (noted, not yet scheduled)

- **Per-customer memory (B2B)** — the agent accumulates knowledge per customer account (setup, history, recurring issues) with **hard isolation between customers**; see spec §10 for the reserved architecture. The `customer_id` plumbing landed in M3; the memory store, its maintenance tool, and prompt hydration get their own milestone when we reach it.
