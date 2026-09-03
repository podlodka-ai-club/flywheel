# Flywheel — AI Customer Support Agent

An asynchronous, decoupled AI support agent for Acme Hotels Inc.'s hospitality guest-technology products. **SQLite (WAL) is the message bus**: an external ticketing platform (Zendesk/Intercom/email router/custom CRM) inserts customer messages into a single `messages` table; a Deno engine claims them atomically, runs an LLM agent ([pi.dev](https://github.com/earendil-works/pi) — `pi-agent-core` + `pi-ai`), and commits replies back to the same table for the platform to deliver. Human escalations use the same durable ledger: a colleague answers in the escalation inbox, that internal response re-enters the queue, and the LLM continues the customer workflow without keeping a worker blocked. The agent also carries **per-customer memory with hard isolation**: durable facts, per-ticket episode summaries, and playbooks distilled from human resolutions and from the support team's internal discussion of a ticket.

- **[specification.md](specification.md)** — full architecture: schema, queue mechanics, integration contract, escalation/failure semantics.
- **[milestones.md](milestones.md)** — delivery plan; each milestone ends with hand-verifiable steps. (M1–M5.7 and M7 with its M7.5/M7.6 addenda complete: queue, recovery, coalescing, logging, real agent, direct Markdown wiki search, durable human escalation and hand-back, the internal team chat the agent learns from, and per-customer memory behind a pluggable run/event/schedule seam. Remaining, in execution order: M6 hardening, M8 shared knowledge.)

The agent's tools (documentation search, CRM lookup, customer deployment state, escalation) call systems through the **connector seam** in `src/connectors/`. The knowledge-base connector parses and indexes the Markdown in `wiki/` directly; CRM/deployment remain fixture-backed, while escalation makes an idempotent outbound `TicketingConnector.escalateTicket` state-change call and records the platform's reference plus the concrete human request on reply metadata. Customer-scoped tools take no id argument: they are hard-bound to the ticket's verified `customer_id`; the memory tools can only write customer-stated facts, never resolution history.

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
| `deno task start` | Runs the agent engine: N worker loops + zombie-lease reaper + the memory runtime (the strategy's jobs, e.g. the summarizer sweep, and its event tail). Loads `.env`. Extra arguments reach the engine: `deno task start --memory=<name>` picks the [memory strategy](#memory-strategies) for that start. |
| `deno task dev:ui` | Runs the dev web harness on `localhost:8787` (auto-restarts on code changes). |
| `deno task db:init` | Creates/migrates `./data/support.db` from [schema.sql](schema.sql). Idempotent; also runs implicitly on every open. |
| `deno task test` | Full test suite (~80 tests). No network, no API key needed — the LLM harness and summarizer are tested against pi-ai's faux provider and the echo summarizer. |
| `deno task wiki:check` | Parses and validates every wiki Markdown page; add `-- --coverage` to regenerate `wiki/coverage.md`. |
| `deno task wiki:search -- "<query>"` | Runs ranked production wiki retrieval directly, without an LLM. |

## Environment variables

All optional unless noted. The engine (`deno task start`) reads `.env` automatically; exported shell vars take precedence.

### Agent & LLM

| Variable | Default | Meaning |
|---|---|---|
| `AGENT_MODE` | `llm` | `llm` = real agent; `echo` = deterministic `ECHO: <text>` replies, no key needed. |
| `LLM_PROVIDER` | `openrouter` | `openrouter` or `google` out of the box (any pi-ai provider id works with its conventional key env). |
| `LLM_MODEL` | *(provider default)* | `openai/gpt-4o-mini` on OpenRouter; `gemini-3.6-flash` on Google. Any model id from the provider's catalog. |
| `LLM_THINKING` | `off` | Requested reasoning level (`off`\|`minimal`\|`low`\|`medium`\|`high`\|`xhigh`\|`max`). Auto-clamped per model from catalog metadata (`thinking_level_clamped` log), **and** self-corrects at runtime: if the live endpoint still rejects with "reasoning is mandatory", the engine bumps one level, retries, and memoizes (`thinking_level_bumped` log). Non-reasoning models force `off`. |
| `OPENROUTER_API_KEY` | — | **Required** when `LLM_PROVIDER=openrouter` and `AGENT_MODE=llm`. |
| `GEMINI_API_KEY` | — | **Required** when `LLM_PROVIDER=google` and `AGENT_MODE=llm`. |

Missing key → the engine exits at startup with the exact fix in the error message.

### Knowledge base

| Variable | Default | Meaning |
|---|---|---|
| `KNOWLEDGE_BASE_PATH` | `./wiki` | Directory containing the Markdown wiki pages indexed by `search_knowledge_base`. A path outside `./wiki` needs a matching Deno `--allow-read` permission. |
| `KNOWLEDGE_BASE_RELOAD` | `0` | `1` checks Markdown mtimes before each search and atomically reloads changed pages; useful during development. Production normally keeps the startup snapshot. |

### Per-customer memory (spec §10)

| Variable | Default | Meaning |
|---|---|---|
| `MEMORY_ENABLED` | `1` | Master switch for per-customer memory in the engine: run handles (hydration into the prompt + the strategy's memory tools) and the memory runtime (the strategy's jobs and event handler). The harness Memory view stays available regardless. |
| `MEMORY_STRATEGY` | `structured` | Which memory implementation runs — a name from the registry in `src/memory/registry.ts`. Set it identically for the engine and the dev harness (like `DATABASE_PATH`); `deno task start --memory=<name>` overrides it for one engine start. See [Memory strategies](#memory-strategies). |
| `SUMMARIZE_AFTER_MS` | `86400000` | Idle time before a terminal thread is summarized into an `episode` memory (24h; set small in dev). |
| `SUMMARIZER_PROVIDER` / `SUMMARIZER_MODEL` | *(inherit agent)* | Run summarization on a different (typically cheaper) provider/model than the main agent. |
| `MEMORY_HYDRATION_BUDGET` | `1200` | Approx. token budget for memories rendered into the system prompt. |
| `MEMORY_RUN_WRITE_CAP` | `3` | Max memory writes per agent run (poisoning-velocity bound). |
| `MEMORY_ACTIVE_CAP` | `200` | Max active memories per customer (oldest auto-archived beyond it). |
| `MEMORY_EVENT_POLL_MS` | `1000` | Cadence of the memory runtime's bus tail — how quickly a new row (a committed reply, a platform note such as a ticket closure) reaches the strategy's event handler; also the retry delay for a failing handler. |

How these fit together — kinds and provenance, the three write paths, hydration into the prompt, caps, and erasure — is explained in [Memory](#memory) below.

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

## Memory

The agent carries **per-customer memory**: what it learns about a business account in one ticket is available in the next one. [specification.md](specification.md) §10 is the binding design; this section is the practical tour of what the code does today. The implementation sits behind a small strategy seam so variants can be swapped per engine start — see [Memory strategies](#memory-strategies) below; everything up to there describes the default `structured` strategy. Memory lives in its own `memories` table in the same SQLite file (the `messages` table stays the sole queue/conversation store), and every row, query, and tool is keyed by the **verified `customer_id`** the platform attached at ingest — a thread without a verified customer gets no memory at all: nothing hydrates, the memory tools don't exist, the summarizer skips it.

A memory is one row holding one concise statement plus bookkeeping: a **kind**, a **provenance**, the source thread, timestamps, optional expiry, and supersede/archive markers.

### What each kind is

| Kind | One-line role | Written by | Decays |
|---|---|---|---|
| `fact` | What is durably true about this account. | the agent, via `save_memory` | no |
| `episode` | What happened in one closed ticket. | the summarizer | after 180 days |
| `playbook` | How to fix a known symptom for this customer. | the summarizer | no |

**A `fact`** is one durable, curated sentence about the account that will still matter on future tickets: environment constraints, maintenance windows, contacts, preferences, long-running projects — "3.x upgrade blocked until their PostgreSQL migration lands", "maintenance window is Sunday 02:00". Facts are the only kind the agent itself can write, they are always recorded as unverified customer claims, and they are never edited in place: a correction writes a new fact that supersedes the old one, so the audit chain survives. Transient details ("restarted the connector today") and secrets don't belong here, and the tool description tells the agent so.

**An `episode`** is the story of one closed ticket, written after the fact by the summarizer: 1–3 sentences covering the issue, what was done, and the outcome. There is exactly one per thread (enforced by a unique index). Episodes exist for continuity — the next run can see "CSV export broke after the 2.9 upgrade and re-enabling the exporter fixed it" without replaying that transcript. They carry a 180-day expiry because old ticket narratives lose value, and they hydrate after facts and playbooks, so they are the first thing trimmed when the token budget runs short.

**A `playbook`** is an operational rule distilled from how *humans* resolved a ticket: one "Symptom: … → Fix: …" line. It is the highest-trust memory and the payoff of the self-learning loop — the next ticket with the same symptom is answered from the playbook instead of escalated. A playbook can only come from platform-inserted human rows passing through the summarizer — a human-resolution note, or the support team's internal discussion of the ticket (the summarizer keeps the conclusion the team settled on, not the hypotheses they withdrew); no conversation can produce one. That trust is why playbooks never expire and why hydration labels them as human-sourced, naming which source it was.

Live state ("they run 2.9.4") deliberately does **not** go into memory — that is what `lookup_customer_setup` is for, fresh per ticket, because memory of it would go stale.

**Provenance** records who vouches for an entry — `customer_stated`, `ticket_summary`, `human_resolution`, or `team_discussion` (`agent_inferred` is reserved for future engine-derived writes). It is assigned by engine code from the write path — the model cannot choose it; a playbook's provenance comes from which human rows the thread actually holds, and one the model returns without any is dropped — and hydration renders it, so claims always read as claims.

### How memories get written

There are exactly three write paths (spec §10.3):

1. **The agent, mid-run.** `save_memory(content, supersedes?)` records one durable fact worth knowing on future tickets; `archive_memory(id)` retires one that is wrong or withdrawn. In-run saves are always stored as `kind='fact'` with `provenance='customer_stated'` — the run is customer-driven, so nothing the model writes can outrank a claim, and episodes/playbooks cannot be forged from a conversation. The tools are only built for runs with a verified customer (and `MEMORY_ENABLED=1`), and saves are capped at `MEMORY_RUN_WRITE_CAP` (default 3) per run.
2. **The end-of-ticket summarizer** — the strategy's declared job, driven by the memory runtime, that turns closed, idle tickets into `episode`s (and, when a human-resolution note or a team discussion is present, `playbook`s); when the platform signals that a ticket was closed, the same pipeline runs right away instead. Cadence, thread selection, the closure trigger, and the exact pipeline are in [How summarization works](#how-summarization-works) below.
3. **Human feedback — the self-learning loop.** Two kinds of platform-inserted `role='system', status='completed'` rows teach the agent (the queue never claims either). A **resolution note** (`metadata.type='human_resolution'`, the harness's "🤝 human resolution" button) describes how a human fixed an escalated ticket. An **internal team note** (`metadata.type='internal_note'`, `metadata.author={id,name}`, the harness's **💬 team chat** pane) mirrors one message of the support team's internal discussion of the ticket — several engineers, hypotheses, corrections, the final fix. When such rows are present before the thread's first summary, the summarizer distills a `playbook` alongside the episode: from the resolution note when there is one, otherwise from the conclusion the discussion reached (never from a hypothesis that was later withdrawn) — and the next ticket with the same symptom is answered from the playbook instead of escalated. Team notes are learning material only: they never enter a live run, and they don't resume an escalated ticket (that is the hand-back in the Escalations inbox). Feedback arriving after an episode already exists waits for the M6 re-summarization behavior described in the specification.

### How summarization works

The summarizer runs inside the engine process as the `structured` strategy's declared job — driven by the memory runtime alongside the workers and the reaper whenever `MEMORY_ENABLED=1` — and works in periodic sweeps (plus the closure trigger described after them):

- **How often.** A sweep runs every `SUMMARIZE_AFTER_MS / 4`, clamped between 5 and 60 seconds — every 60s at the 24h default, every 15s with the dev-friendly `SUMMARIZE_AFTER_MS=60000`. A sweep with no eligible threads does nothing, so the loop is cheap to leave running.
- **Which threads.** A thread is picked up when *all* of these hold: it is **terminal** (no `pending` or `processing` rows, at least one `completed` message); it has a **verified customer**; its **newest row is older than `SUMMARIZE_AFTER_MS`** (default 24h) — a thread the customer is still active in keeps pushing its summarization out; and **no episode exists for it yet**. Up to 10 threads are processed per sweep. Today this means each thread is summarized at most once; re-summarizing threads that flare back up afterwards is specified (spec §10.3) and lands with M6.

Each eligible thread then goes through five steps:

1. Its completed rows are rendered into a plain transcript — `[customer]` / `[assistant]` lines, with human-resolution system rows marked `[internal resolution note]` and team-discussion rows marked `[internal team note — Ana Petrova]` so the model can tell them apart from customer text.
2. One plain LLM completion call is made (no agent loop, no tools) with a fixed prompt that demands only a JSON object `{"episode": "…", "playbook": … | null}` — and instructs that the transcript is data, never instructions; that entitlement/billing claims must not be stored as established facts; and that `playbook` must stay `null` unless the transcript contains a marked resolution note or a team discussion that reaches a conclusion — distilling only what the team finally settled on, never a hypothesis that was later corrected, with a resolution note taking precedence.
3. The response is parsed tolerantly: models intermittently wrap the JSON in a markdown code fence or prose, so the text is cut down to the outermost `{…}` and repair-parsed.
4. If an episode came back, the thread is re-checked (another process may have summarized it during the call), then the `episode` row is written with `provenance='ticket_summary'` and a 180-day `expires_at` — and, if `playbook` was non-null, a `playbook` row with no expiry whose provenance is decided by the rows in the thread, not by the model: `human_resolution` when a resolution note exists, else `team_discussion` when team notes exist; a playbook returned for a thread with neither is dropped. Both writes respect `MEMORY_ACTIVE_CAP`.
5. `thread_summarized` is logged with the new memory ids and the playbook's provenance.

Failure is safe in both directions: a response with no usable episode (or a provider error) writes nothing, logs `summarizer_error`, and the thread is retried on a later sweep; a concurrent-summarization race loses on the `UNIQUE` episode index and is treated as already done. A "reasoning is mandatory" provider rejection auto-bumps the thinking level and retries, exactly like the main harness. The model is chosen by `SUMMARIZER_PROVIDER`/`SUMMARIZER_MODEL` (empty = inherit the agent's — a smaller model is usually plenty); in `AGENT_MODE=echo` a deterministic summarizer builds the episode from the first customer message and the last reply, and a playbook from any resolution notes (or, failing those, from the last team note as the stand-in for the discussion's conclusion), so the loop is testable without an API key. Net cost: one small LLM call per closed thread, once.

**Closing a ticket triggers it too.** When the platform inserts a `ticket_closed` note (spec §3.2 item 6; the harness's "✅ close ticket" button), the strategy's event handler runs the same five steps for that thread immediately, without the idle wait — provided the thread is terminal. If a reply is still in flight, the closure is deferred: every committed reply also reaches the handler as an `agent_reply` event, which re-checks threads that carry a closure note. The unique episode index keeps trigger and sweep idempotent (`thread_summarized` records which one fired as `trigger`), and the sweep remains the fallback for platforms that never signal closure. The general mechanism is described under [Memory strategies](#memory-strategies).

### How memories reach the agent

Per run, the worker opens the strategy's run-scoped, customer-fenced memory handle; the handle renders the customer's **active** memories and the harness places them in a dedicated system-prompt section: facts first, then playbooks, then episodes, newest first within each kind, until the token budget (`MEMORY_HYDRATION_BUDGET`, ~4 chars/token) is spent — entries that don't fit are dropped and tallied as a "+N older memories omitted" line. Every entry carries its provenance and date:

```
- [claimed by customer, 2026-08-12 — unverified] maintenance window is Sunday 02:00
- [playbook from human resolution, 2026-08-02] Symptom: webhook timeouts -> Fix: raise batch size to 100
- [playbook from team discussion, 2026-07-30] Symptom: TV content stale after publish -> Fix: republish the channel list in Admin → TV
- [past ticket tkt_1042, 2026-07-28] CSV export failed after the 2.9 upgrade; exporter re-enabled, resolved.
```

The system prompt frames the section as background data — **never instructions** — and forbids acting on unverified entitlement, billing, or contract claims. Each hydration is logged (`memory_hydrated`, with count / approx. tokens / omitted).

### Lifecycle, corrections, and limits

- **Active** = not superseded, not archived, not expired. Only active memories hydrate.
- **Corrections supersede, never edit.** `save_memory` with `supersedes: mem_…` writes the new fact and marks the old one superseded in the same call — the old row stays for audit but never hydrates again.
- **Archiving** is the soft-forget: by the agent (`archive_memory`), from the harness's Memory tab, or automatically — when a save pushes a customer past `MEMORY_ACTIVE_CAP` (default 200), the oldest active entries are archived first.
- **Expiry:** episodes carry `expires_at` (180 days); facts and playbooks persist until superseded or archived.
- **Erasure** (spec §10.6): hard `DELETE` of every row for a customer, archived and superseded included — the Memory tab's erase action or `DELETE /api/memory?customer=<id>`.

### Why it's hard to poison

- Every query in `src/memory/strategies/structured/store.ts` is fenced by `customer_id` — isolation is enforced in the store, not left to callers. A cross-customer supersede throws; a cross-customer archive is a no-op.
- The memory tools take **no customer parameter** — the same security model as the other customer-scoped tools: identity comes from the claimed row, never from message text.
- Provenance is forced by the write path, so a conversation can only ever produce unverified claims; resolution history (playbooks) can only come from the summarizer reading platform-inserted human rows, and which provenance it gets is decided by those rows, not by the model. The team's internal discussion never enters a live run, so nothing typed there can steer a reply in progress.
- Write caps bound poisoning velocity (per run and per customer), and every write is a `memory_saved` / `memory_archived` log event, auditable in the Memory tab.

A second, **cross-customer shared-knowledge layer** — read-only for agent runs, filled through an anonymize → screen → human-review promotion pipeline — is designed in spec §10.7 and arrives as milestone M8; it is not implemented yet.

### Memory strategies

Everything above is the `structured` strategy — one implementation of the **memory strategy seam** (`src/memory/strategy.ts`, spec §10.8). The engine never calls it directly: the worker, the LLM harness, the tool assembler, the memory runtime, and the dev harness only know the seam, so another implementation can be dropped in beside it and selected per engine start — whether it runs on its own clock, reacts to events, or both.

- **Selecting one.** `MEMORY_STRATEGY` (default `structured`) picks the implementation; `deno task start --memory=<name>` overrides it for that engine start. An unknown name stops the engine at startup with the registered list. The dev harness serves its Memory view through the same strategy, so set `MEMORY_STRATEGY` for it too — it shares the database file, so it must share the strategy. `MEMORY_ENABLED=0` switches memory off in the engine whatever the strategy; the Memory view keeps working.
- **Three ports.** A strategy does its work at three moments, and the engine owns the scheduling for all of them. *Run port:* `openRun({ customerId, threadId })` returns the per-run handle the worker opens for verified customers only — `hydrate(...)` produces the prompt section (already labelled with provenance) plus the stats logged on `memory_hydrated`, `tools()` the strategy's own tools, `toolGuidance()` their usage lines for the system prompt; everything here runs before the reply. *Event port:* `events: { types, handle }` receives rows landing on the `messages` bus after the fact — `customer_message`, `agent_reply` (a committed reply), `human_resolution`, `ticket_closed`, `internal_note` (a team-chat message), `system_note` — each with the row, its verified customer, its bus position, and a lazy snapshot of the thread as of that row. *Schedule port:* `jobs: [{ name, intervalMs, run }]` declares loops (sweeps, decay, consolidation) the engine runs. `audit` — list customers, list entries, archive, erase — backs the Memory view and the erasure contract; `describe()` feeds `engine_started`; an optional `close()` runs at shutdown. Rule of thumb: must the agent see it before replying → run port; reacting to something that happened → event port; periodic work → schedule port. A trigger plus a sweep is the robust pairing.
- **How events are delivered.** The memory runtime (`src/memory/runtime.ts`, engine only) tails the `messages` table by rowid every `MEMORY_EVENT_POLL_MS` and hands each new row to the handler in order — always after the producing transaction committed, so no memory code can run inside the fenced completion or touch a reply. Delivery is at-least-once (one cursor per strategy in `memory_cursors`, advanced by compare-and-swap; a crash between handling and advancing replays the row; two engines may both deliver), so handlers must be idempotent. Rows without a verified customer are never delivered. A handler that throws is retried three times, then the row is skipped with `memory_event_dropped` so one bad row never blocks the stream; successes log `memory_event_handled`. A strategy seen for the first time starts at the current end of the bus. To replay retained history, stop the engine and set its cursor's `last_sequence` to `0`; deleting the cursor instead makes the next start treat the strategy as new and resume at the current tail. Jobs log `memory_job_failed` and keep looping.
- **Adding one.** Create `src/memory/strategies/<name>/` with a factory `(deps: { db, config, llm? }) => MemoryStrategy`, register it in `src/memory/registry.ts`, and run with `--memory=<name>`. Implement `openRun` and `audit`; add `events` and/or `jobs` as needed — a rolling-notes strategy might subscribe to `agent_reply` only, a retrieval strategy might need neither. `llm` (the agent's resolved provider setup) is undefined in echo mode and in the dev harness, so a factory must stay key-free and deterministic without it. The spec §10 invariants come with the seam: unverified tickets never reach a strategy (no run handle, no event), tools take no customer id, provenance is assigned in code, and `erase` is a hard delete.

### Seeing it work

Ask for an action the AI cannot perform, such as a refund. The reply is marked escalated and the customer composer is muted. Open **Escalations**, read the requested action, enter the human outcome, and click **Send to AI and continue**. The response becomes an internal pending queue row; after the engine processes it, the thread shows a human-colleague bubble and a new human-assisted customer reply, then unmutes. `human_escalation_opened`, `dev_ui_human_escalation_responded`, and `human_escalation_continued` provide the audit trail without logging the human response body.

Or let the team figure it out: open the **💬 team chat** pane next to the transcript, pick who you are writing as, and discuss the ticket as different colleagues — a wrong guess by one, the real fix by another. The customer never sees these notes and neither does the live agent. Click "✅ close ticket": `thread_summarized` reports `playbookProvenance: "team_discussion"`, the Memory tab shows the playbook distilled from the conclusion (not the wrong guess), and the next ticket from that customer hydrates it as `[playbook from team discussion, …]`. If an escalation is open, the pane shows the AI's request with a link to the Escalations inbox — discussing a ticket doesn't resume it; the hand-back there does, attributed to the same selected person.

Run with `SUMMARIZE_AFTER_MS=60000`, send a ticket, let the agent reply, click "🤝 human resolution" and describe the fix. About a minute after the thread goes quiet, `thread_summarized` appears in the Logs view, and the episode and playbook show up in the Memory tab. Start a new thread as the same customer: `memory_hydrated` in the logs shows what the agent now knows, and the reply reflects it. Or skip the wait: click "✅ close ticket" and the episode appears within a second (`memory_event_handled`, then `thread_summarized` with `trigger: "ticket_closed"`). All of this works in `AGENT_MODE=echo` too — no API key needed.

## The dev harness

`tools/ui/` simulates the **external support platform** (which is out of scope for the core — the `messages` table is the integration contract, spec §3.2). It runs as a separate process sharing the SQLite file, exactly like a real co-located adapter would. Six views:

- **Conversations** — send messages as a customer picked from the CRM directory (optionally pin an external message id and hit "↻ redeliver" to watch webhook-redelivery dedup do nothing). Completed replies are auto-stamped `sent_to_customer_at` when rendered, with a delivered tick, reply link, escalation/human-assisted badges, and model · tokens · cost chip. An escalated thread's customer composer stays muted until its human response has produced a continuation. Click any bubble for its full technical record; threads can be deleted. Per-thread actions: "🤝 human resolution" inserts a separate completed learning note (spec §3.2 item 5), "✅ close ticket" inserts a completed closure note (item 6) that triggers immediate episode summarization, and "🪵 logs for this thread" jumps to filtered logs. System rows show their note type as a chip. A **⚠ Failed messages** panel appears when inputs exhaust retries. **💬 team chat** toggles a pane beside the transcript that emulates the support team's internal discussion of the ticket (spec §3.2 item 7): pick who you are writing as from the support-user directory (`fixtures/colleagues.json`, remembered per browser), post notes as different people, and see them as `internal_note` rows with `metadata.author` — hidden from the customer transcript and the sidebar snippet, never hydrated into a run, distilled into a playbook by the summarizer at close. The pane also shows an open escalation's request (linking to the inbox) and warns when the ticket already has an episode, so a late note visibly waits for M6 re-summarization.
- **Escalations** — the human operator inbox. Each escalation shows the verified customer, internal reason, concrete requested decision/action, external reference, and the safe message already sent to the customer. A colleague — the same directory person selected in the team chat pane; the id lands in `metadata.responder` — submits an internal answer; the UI inserts a one-shot `role='system', status='pending', metadata.type='human_escalation_response'` event linked to the escalated assistant row. The normal worker lease/retry/fence pipeline produces the continuation. This differs from `human_resolution`, which is completed, unclaimable, and used only for later learning.
- **Database** — a raw browser/editor over **any table in the SQLite file** (`messages`, `memories`, `memory_cursors`, …): row counts, equality filters, and in-place cell editing that respects column types and the engine's enum vocabularies (tables without a single-column primary key are read-only).
- **Logs** — tails `engine.log` / `dev-ui.log` with level/text/thread filters and follow mode; memory, connector, summarizer, and memory-runtime events (`memory_saved`, `connector_request`, `thread_summarized`, `memory_event_handled`, …) all show up here.
- **Memory** — the audit surface for per-customer memory, served through the configured memory strategy (`MEMORY_STRATEGY`, same as the engine's): every entry with kind, provenance, dates, source thread, and status (active/superseded/expired/archived); archive individual entries or run the spec §10.6 **erase-customer** operation.
- **Config** — every configuration option's default next to the **actual** value from `.env`, which the harness parses as text (it never loads the file into its environment). API keys appear as configured / not configured only — values never leave the server. Entries in `.env` that match no known variable are listed separately, so typos surface.

## Testing & development

```bash
deno task test
```

Covers: DAL round-trips and dedup, atomic claim + per-thread FIFO serialization, the fenced completion transaction and duplicate-reply backstops, reaper recovery and retry exhaustion, follow-up coalescing, fault markers, log rotation, hydration, customer-scoped tools, idempotent escalation request/ack, the full escalation → human response → AI continuation lifecycle, the memory store and strategy seam, the event/schedule runtime and immediate close-triggered summarization, playbook distillation from separate human-resolution notes and from internal team discussions (code-assigned provenance, withdrawn hypotheses excluded, team notes never hydrated into a run), the support-user directory, and the LLM harness against a canned provider—including memory hydration and writes through the agent loop.

Useful during development:

- **Free end-to-end runs:** `AGENT_MODE=echo deno task start` — the whole pipeline without an API key, including memory: a deterministic echo summarizer produces episodes/playbooks too.
- **Fast memory loops:** `SUMMARIZE_AFTER_MS=60000 SUMMARIZER_MODEL=openai/gpt-4o-mini deno task start` — threads summarize a minute after going idle, on a cheap model.
- **Event-triggered memory, no waiting:** click "✅ close ticket" in the thread header (or `POST /api/threads/<id>/ticket_closed`) — `memory_event_handled` and `thread_summarized` (`trigger: "ticket_closed"`) land within about a second, `SUMMARIZE_AFTER_MS` untouched.
- **Swap the memory implementation:** `AGENT_MODE=echo deno task start --memory=<name>` — one engine start on another registered strategy (see [Memory strategies](#memory-strategies)); an unknown name fails fast with the list.
- **Crash drills:** `DEV_FAULTS=1 LOCK_TIMEOUT_MS=6000 REAPER_INTERVAL_MS=1000 AGENT_MODE=echo deno task start`, then send `[[sleep_once:20000]] hello` and `kill -9` the engine (its pid is in the `engine_started` log line). Restart and watch the reaper reclaim it — exactly one reply. See [milestones.md](milestones.md) M3 for the full drill list.
- **Reset:** stop everything and delete `./data/` for a fresh database and logs.
- The harness auto-restarts on server-code changes (`--watch`); reload the browser after UI changes.

## Documentation corpus: `wiki/`

`wiki/` holds a synthetic **internal support wiki** for Acme Hotels Inc., the hospitality guest-technology vendor whose 250 support tickets are filed as this repository's issues (FW-001 … FW-250). It exists for the memory evals in `evals/`: the agent needs a documentation baseline to look up, and scenario authors need to know exactly what that baseline contains so that memory tests target what it does *not* contain. Every product fact on the pages is traced to the ticket it came from through a hidden `<!-- evidence: FW-021 -->` comment (the pages read like a normal wiki and the agent never sees ticket numbers); per-hotel details and one-off resolutions are deliberately left out (the exclusion rules are in `wiki/README.md`, together with the list of conventions that are illustrative rather than corpus-derived).

Twenty-two GitHub-wiki-style pages: how the support team works (statuses, escalation triggers `E-`, intake gates `Q-`), one page per product (Acme TV, HSIA guest Wi-Fi, PMS integration, ordering, admin panel, …), and reference pages (confusable symptoms `X-`, unsupported requests `U-`, known issues `K-`, a RU/EN phrasebook). Entries are self-contained and addressable by identifier, so a retrieved fragment carries its own context.

**The knowledge base.** The `wiki/*.md` files themselves are the KB. Page metadata and heading structure define the stable article identifiers and chunk boundaries; hidden `<!-- evidence: FW-nnn -->` comments remain authoring/audit data and are not shown to the agent. `wiki/coverage.md` maps tickets to the pages that reference them.

**Runtime retrieval.** A shared TypeScript loader parses and chunks `wiki/*.md` directly for the runtime, evals, tests, and CLI, then builds an ephemeral SQLite FTS5/BM25 index with relevance thresholds and corpus-revision logging. There is no generated or persistent KB artifact. Search requests do not depend on GitHub or scrape its website; a GitHub-edited wiki can instead be cloned/fetched into the configured local Markdown directory before startup.

## Layout

```
schema.sql            DDL: messages (queue + history + outbound buffer), memories, memory_cursors, with indexes
fixtures/             mock-connector data: CRM customers, deployments, and the support-user directory (colleagues)
src/
  config.ts           env-driven configuration (all variables above) + the --memory flag
  main.ts             engine entrypoint: workers + reaper + memory runtime + graceful shutdown
  db/                 SQLite client/migrations, message DAL, queue (claim/fence/reap)
  agent/              harness (echo + pi.dev llm), hydrator, system prompt, tools/
  connectors/         external-system client interfaces + fixture-backed mocks (the swap seam)
  memory/             strategy seam (strategy.ts: run / event / schedule ports), registry (name → factory),
                      runtime.ts (runs a strategy's jobs, tails the bus into its event handler), strategies/<name>/
    strategies/structured/  the spec §10 design: store, summarizer (echo + LLM; sweep job + ticket_closed trigger), save_memory/archive_memory
  engine/             worker loops, zombie-lease reaper
  logger/             @std/log: console + rotating file sinks, JSON lines
tools/ui/             dev harness (never deployed): server + single-file web UI
tests/                deno test suite
wiki/                 Markdown knowledge base and memory-eval baseline
evals/                memory-eval scenarios (YAML) and the runner design
```

## Operational notes

- **Permissions:** the engine runs sandboxed — network pinned to the LLM provider hosts, reads pinned to `./data` + `schema.sql` + `./fixtures` + `./wiki`, writes to `./data`. `--allow-env`/`--allow-sys` are broad for the engine only (the LLM SDK probes env/system metadata dynamically); see spec §9.1.
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
| Engine exits: `Unknown memory strategy "…"` | `MEMORY_STRATEGY` / `--memory` names nothing in `src/memory/registry.ts` — the error lists the registered names. |
| Memory view empty although the engine saves memories | The harness runs a different `MEMORY_STRATEGY` than the engine — set it identically in both terminals. |
| Closing a ticket does not summarize it | The thread must be terminal (no `pending`/`processing` rows) with a verified customer; a reply in flight defers the summary to that reply's `agent_reply` event. Look for `memory_event_handled` with `type: "ticket_closed"` — if it never appears, the engine predates the change or runs `MEMORY_ENABLED=0`. |
| `memory_event_dropped` in the logs | The strategy's event handler failed three times on one row (the error is in the entry) and the tail moved on. Fix the cause; the structured strategy's sweep still picks the thread up later, or delete the strategy's row in `memory_cursors` to replay from the start of the bus. |
