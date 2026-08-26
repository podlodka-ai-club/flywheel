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
- Fault injection **in the echo agent only**, enabled by `DEV_FAULTS=1`: `[[sleep:8000]]` delays the run, `[[fail]]` throws
- Harness: a **Failed messages** panel (polls `idx_messages_failed` like a real platform would) with a "Route to human" button that stamps the acknowledgment; attempt counters visible on messages

**You verify (all from the browser, engine in its own terminal):**
1. Send `[[sleep:8000]] hello`, `kill -9` the engine mid-run, restart it → the reaper reclaims and exactly one reply arrives.
2. Set a short `LOCK_TIMEOUT_MS` so a slow run gets reaped while its worker is still alive → the losing worker logs `reply_discarded_lost_lease`; exactly one reply shows in the UI.
3. While a `[[sleep]]` run is in flight, send two follow-ups → one consolidated echo reply covering all three messages.
4. Send `[[fail]] test` → attempt counter climbs to 3 → message lands in the Failed panel → "Route to human" acknowledges it.

**Automated tests:** reaper reclaim, retry exhaustion → failed, duplicate-reply race (fence + `UNIQUE(in_reply_to)` backstop), coalescing.

---

## M4 — Real AI agent (pi.dev)

**Goal:** swap echo for the real LLM agent: pi-ai gateway, pi-agent-core loop, thread hydration, telemetry. Requires `ANTHROPIC_API_KEY`.

**Build:**
- `src/agent/harness.ts`: real implementation via `@earendil-works/pi-agent-core` + `@earendil-works/pi-ai` (`AGENT_MODE=llm`, the default)
- `src/agent/hydrator.ts`: completed thread rows → agent conversation turns
- `src/agent/prompt.ts`: support system prompt
- Coalescing regeneration prompt ("the customer has since added: …")
- Telemetry: `model`, `tokens_in`/`tokens_out`, `cost_usd` on reply rows; `message_completed` log events
- Harness: telemetry chips on reply bubbles (model · tokens · cost)

**You verify:**
1. Ask a real question in the browser, get a real support-style answer.
2. A follow-up like "what did I just ask you?" proves thread memory via hydration.
3. Reply bubbles show model/tokens/cost; the engine terminal shows `message_completed` events.
4. `AGENT_MODE=echo` still works — free regression testing forever after.

**Automated tests:** hydration mapping, harness against a mocked provider (no network in tests).

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
