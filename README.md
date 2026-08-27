# Flywheel — AI Customer Support Agent

An asynchronous, decoupled AI support agent for B2B products. **SQLite (WAL) is the message bus**: an external ticketing platform (Zendesk/Intercom/email router/custom CRM) inserts customer messages into a single `messages` table; a Deno engine claims them atomically, runs an LLM agent ([pi.dev](https://github.com/earendil-works/pi) — `pi-agent-core` + `pi-ai`), and commits replies back to the same table for the platform to deliver. The agent carries **per-customer memory with hard isolation**: durable facts, per-ticket episode summaries, and playbooks distilled from human resolutions — so escalations teach it, and escalation rates fall over time.

- **[specification.md](specification.md)** — full architecture: schema, queue mechanics, integration contract, escalation/failure semantics.
- **[milestones.md](milestones.md)** — delivery plan; each milestone ends with hand-verifiable steps. (M1–M5 and M7 complete: queue, recovery, coalescing, logging, real agent, tools & escalation, per-customer memory & self-learning. Remaining, in execution order: M6 hardening, M8 shared knowledge.)

The agent's tools (documentation search, CRM lookup, customer deployment state, escalation) call external systems through the **connector seam** in `src/connectors/` — currently fixture-backed mocks that simulate outbound requests; production swaps in real wiki/CRM/ticketing/telemetry clients behind the same interfaces (escalation makes an outbound `TicketingConnector.escalateTicket` state-change call and records the platform's reference on the reply's metadata). Customer-scoped tools take no id argument: they are hard-bound to the ticket's verified `customer_id`; the memory tools can only write customer-stated facts, never resolution history.

## Prerequisites

- **Deno 2.2+** (uses the built-in `node:sqlite`; developed on 2.9). No Node, no build step.
- **An LLM API key** for live agent replies — either:
  - [OpenRouter](https://openrouter.ai/keys) → `OPENROUTER_API_KEY` (default provider), or
  - [Google AI Studio](https://aistudio.google.com/apikey) (free tier) → `GEMINI_API_KEY` with `LLM_PROVIDER=google`.
  - No key? Run the deterministic echo agent: `AGENT_MODE=echo`.

## Quickstart

```bash
deno task db:init
```

Create a `.env` file in the repo root (gitignored; auto-loaded by the engine):

```
OPENROUTER_API_KEY=sk-or-...
```

Then, in two terminals:

```bash
deno task start
```

```bash
deno task dev:ui
```

Open **http://localhost:8787**, create a thread, and chat as the customer. Replies appear in about a second with model/token/cost chips and a "delivered" tick.

## Tasks

| Task | What it does |
|---|---|
| `deno task start` | Runs the agent engine: N worker loops + zombie-lease reaper + memory summarizer. Loads `.env`. |
| `deno task dev:ui` | Runs the dev web harness on `localhost:8787` (auto-restarts on code changes). |
| `deno task db:init` | Creates/migrates `./data/support.db` from [schema.sql](schema.sql). Idempotent; also runs implicitly on every open. |
| `deno task test` | Full test suite (~50 tests). No network, no API key needed — the LLM harness and summarizer are tested against pi-ai's faux provider and the echo summarizer. |

## Environment variables

All optional unless noted. The engine (`deno task start`) reads `.env` automatically; exported shell vars take precedence.

### Agent & LLM

| Variable | Default | Meaning |
|---|---|---|
| `AGENT_MODE` | `llm` | `llm` = real agent; `echo` = deterministic `ECHO: <text>` replies, no key needed. |
| `LLM_PROVIDER` | `openrouter` | `openrouter` or `google` out of the box (any pi-ai provider id works with its conventional key env). |
| `LLM_MODEL` | *(provider default)* | `openai/gpt-4o-mini` on OpenRouter; `gemini-2.5-flash` on Google. Any model id from the provider's catalog. |
| `LLM_THINKING` | `off` | Requested reasoning level (`off`\|`minimal`\|`low`\|`medium`\|`high`\|`xhigh`\|`max`). Auto-clamped per model from catalog metadata (`thinking_level_clamped` log), **and** self-corrects at runtime: if the live endpoint still rejects with "reasoning is mandatory", the engine bumps one level, retries, and memoizes (`thinking_level_bumped` log). Non-reasoning models force `off`. |
| `OPENROUTER_API_KEY` | — | **Required** when `LLM_PROVIDER=openrouter` and `AGENT_MODE=llm`. |
| `GEMINI_API_KEY` | — | **Required** when `LLM_PROVIDER=google` and `AGENT_MODE=llm`. |

Missing key → the engine exits at startup with the exact fix in the error message.

### Per-customer memory (spec §10)

| Variable | Default | Meaning |
|---|---|---|
| `MEMORY_ENABLED` | `1` | Per-customer memory: hydration into the prompt, `save_memory`/`archive_memory` tools, and the end-of-ticket summarizer. |
| `SUMMARIZE_AFTER_MS` | `86400000` | Idle time before a terminal thread is summarized into an `episode` memory (24h; set small in dev). |
| `SUMMARIZER_PROVIDER` / `SUMMARIZER_MODEL` | *(inherit agent)* | Run summarization on a different (typically cheaper) provider/model than the main agent. |
| `MEMORY_HYDRATION_BUDGET` | `1200` | Approx. token budget for memories rendered into the system prompt. |
| `MEMORY_RUN_WRITE_CAP` | `3` | Max memory writes per agent run (poisoning-velocity bound). |
| `MEMORY_ACTIVE_CAP` | `200` | Max active memories per customer (oldest auto-archived beyond it). |

Memory facts saved during runs are always recorded as **customer-stated claims** (never authoritative); episodes and playbooks are written only by the summarizer — playbooks are distilled from platform-inserted `human_resolution` notes, which is the self-learning loop. The harness's **Memory** tab is the audit surface (list, archive, erase-per-customer), and "🤝 human resolution" on a thread simulates the platform's resolution note.

### Queue & workers

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_PATH` | `./data/support.db` | SQLite file (WAL mode; parent dir auto-created). |
| `WORKER_CONCURRENCY` | `2` | Concurrent worker loops in the engine process. |
| `POLL_INTERVAL_MS` | `500` | Queue polling cadence per worker (with jitter). |
| `LOCK_TIMEOUT_MS` | `600000` | Lease lifetime (10 min). Set above worst-case agent runtime — there is no mid-run lease renewal; the fenced commit covers the residual race. |
| `MAX_RETRIES` | `3` | Attempts before a message is terminally `failed` (surfaced to the platform via `idx_messages_failed`). |
| `REAPER_INTERVAL_MS` | `5000` | Zombie-lease sweep cadence (auto-clamped to ≤ half the lease). |

### Logging

| Variable | Default | Meaning |
|---|---|---|
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` — applies to console and file sinks. |
| `LOG_DIR` | `./data/logs` | Per-process rotating files: `engine.log`, `dev-ui.log`. Same single-line JSON as stdout. |
| `LOG_MAX_BYTES` | `5242880` | Rotation threshold per file (5 MB). |
| `LOG_BACKUP_COUNT` | `3` | Numbered backups kept (`engine.log.1`, …). |

### Dev harness & faults

| Variable | Default | Meaning |
|---|---|---|
| `DEV_UI_PORT` | `8787` | Harness port (`PORT`, e.g. from a preview runner, wins over it — lets several harness instances watch one DB). |
| `DEV_FAULTS` | `0` | `1` enables fault markers **in echo mode only**: `[[sleep:ms]]` delays every attempt, `[[sleep_once:ms]]` delays only attempt 1, `[[fail]]` throws. |

## The dev harness

`tools/ui/` simulates the **external support platform** (which is out of scope for the core — the `messages` table is the integration contract, spec §3.2). It runs as a separate process sharing the SQLite file, exactly like a real co-located adapter would. Four views:

- **Conversations** — send messages as a customer picked from the CRM directory (optionally pin an external message id and hit "↻ redeliver" to watch webhook-redelivery dedup do nothing). Completed replies are auto-stamped `sent_to_customer_at` when rendered, with a delivered tick, reply link, escalation badge, and model · tokens · cost chip. Click any bubble for its full technical record; threads can be deleted. Per-thread actions: "🤝 human resolution" inserts a platform resolution note (spec §3.2 item 4 — the summarizer distills it into a playbook) and "🪵 logs for this thread" jumps to the filtered Logs view. A **⚠ Failed messages** panel appears when messages exhaust retries — "Route to human" acknowledges them.
- **Database** — a raw browser/editor over **any table in the SQLite file** (`messages`, `memories`, …): row counts, equality filters, and in-place cell editing that respects column types and the engine's enum vocabularies (tables without a single-column primary key are read-only).
- **Logs** — tails `engine.log` / `dev-ui.log` with level/text/thread filters and follow mode; memory, connector, and summarizer events (`memory_saved`, `connector_request`, `thread_summarized`, …) all show up here.
- **Memory** — the audit surface for per-customer memory: every entry with kind, provenance, dates, source thread, and status (active/superseded/expired/archived); archive individual entries or run the spec §10.6 **erase-customer** operation.

## Testing & development

```bash
deno task test
```

Covers: DAL round-trips and dedup, atomic claim + per-thread FIFO serialization, the fenced completion transaction and `UNIQUE(in_reply_to)` duplicate-reply backstop, reaper recovery and retry exhaustion, follow-up coalescing, fault markers, log rotation, hydration, tools (scoping, escalation ack, memory provenance/caps), the memory store (isolation, supersede chains, expiry, erasure), the summarizer (idempotency, playbook distillation from human-resolution notes), and the LLM harness against a canned provider — including memory hydration reaching the system prompt and `save_memory` persisting through the agent loop.

Useful during development:

- **Free end-to-end runs:** `AGENT_MODE=echo deno task start` — the whole pipeline without an API key, including memory: a deterministic echo summarizer produces episodes/playbooks too.
- **Fast memory loops:** `SUMMARIZE_AFTER_MS=60000 SUMMARIZER_MODEL=openai/gpt-4o-mini deno task start` — threads summarize a minute after going idle, on a cheap model.
- **Crash drills:** `DEV_FAULTS=1 LOCK_TIMEOUT_MS=6000 REAPER_INTERVAL_MS=1000 AGENT_MODE=echo deno task start`, then send `[[sleep_once:20000]] hello` and `kill -9` the engine (its pid is in the `engine_started` log line). Restart and watch the reaper reclaim it — exactly one reply. See [milestones.md](milestones.md) M3 for the full drill list.
- **Reset:** stop everything and delete `./data/` for a fresh database and logs.
- The harness auto-restarts on server-code changes (`--watch`); reload the browser after UI changes.

## Layout

```
schema.sql            DDL: messages (queue + history + outbound buffer) and memories, with indexes
fixtures/             mock-connector data: KB articles, CRM customers, deployments
src/
  config.ts           env-driven configuration (all variables above)
  main.ts             engine entrypoint: workers + reaper + summarizer + graceful shutdown
  db/                 SQLite client/migrations, message DAL, queue (claim/fence/reap)
  agent/              harness (echo + pi.dev llm), hydrator, system prompt, tools/
  connectors/         external-system client interfaces + fixture-backed mocks (the swap seam)
  memory/             per-customer memory store, hydration rendering, summarizer (echo + LLM)
  engine/             worker loops, zombie-lease reaper
  logger/             @std/log: console + rotating file sinks, JSON lines
tools/ui/             dev harness (never deployed): server + single-file web UI
tests/                deno test suite
```

## Operational notes

- **Permissions:** the engine runs sandboxed — network pinned to the LLM provider hosts, reads pinned to `./data` + `schema.sql` + `./fixtures`, writes to `./data`. `--allow-env`/`--allow-sys` are broad for the engine only (the LLM SDK probes env/system metadata dynamically); see spec §9.1.
- **Delivery guarantees:** at-least-once processing with at-most-one delivered reply per customer message (ownership-fenced commit + unique-index backstop). Retry spend on the LLM is accepted; duplicate customer replies are not.
- **Multiple engine processes** on one host are safe (claims are atomic in SQLite); the SQLite file must be on a local filesystem — network mounts are unsupported with WAL.
- **Failures are never silent:** after `MAX_RETRIES`, messages become `failed` and surface to the platform (and the harness's Failed panel) until acknowledged.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Engine exits: "AGENT_MODE=llm needs an API key" | Put the key in `.env` (or export it), or run `AGENT_MODE=echo`. |
| `Model "…" not found for provider` | Pick an id from the error's examples, or unset `LLM_MODEL` for the provider default. |
| Port 8787 in use | A harness is already running — reuse it, or start another with `PORT=8788 deno task dev:ui`. |
| UI says "harness unreachable" | The harness process predates a code change — restart `deno task dev:ui` (it normally auto-restarts via `--watch`). |
| Messages sit `pending` forever | No engine running — start `deno task start`. |
| Message stuck `processing` after a crash | Wait for the reaper (`LOCK_TIMEOUT_MS`, default 10 min) or restart the engine; it reclaims expired leases on its first sweep. |
| No episodes/playbooks appearing | The summarizer waits for threads to be terminal **and** idle for `SUMMARIZE_AFTER_MS` (default 24h) — set it to e.g. `60000` in dev. Check the Logs view for `thread_summarized` / `summarizer_error`. |
| "Reasoning is mandatory" from the provider | Handled automatically (harness *and* summarizer bump the thinking level and memoize — look for `thinking_level_bumped`); if you see it terminally, the engine predates the fix — restart it. |
