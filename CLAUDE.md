# CLAUDE.md — working in the Flywheel repo

Flywheel is a B2B AI customer-support agent framework: Deno 2.x, SQLite (WAL) as the message bus between an external ticketing platform and an LLM agent built on pi.dev (`@earendil-works/pi-agent-core` + `pi-ai`), with a zero-build dev web harness.

**Document map (do not duplicate their content — keep them true):**
- `specification.md` — the binding architecture. Every design decision lives here (§3.2 integration contract, §4 queue mechanics, §6 tools, §10 memory design).
- `milestones.md` — the delivery plan. Milestone **numbers are stable identifiers; execution order is stated in the intro** (currently M6 hardening → M8 shared knowledge; M5.5 wiki search is complete). Check it for what's done and what's next.
- `README.md` — developer onboarding: tasks, every env var, troubleshooting.

## Working agreement with the user

- **Milestone rhythm.** Implement one milestone, pre-verify it yourself (tests + live run + browser), then STOP. The user personally runs the milestone's "You verify" list before work continues. Never start the next milestone unprompted.
- **Docs move with code, in the same change.** Any behavior change updates specification.md / milestones.md / README.md immediately. Drift bites for real (example: `AGENT_MODE` default flipping to `llm` silently broke the M3 echo-only fault-marker drills until the docs were fixed).
- **The user edits files between turns** (fixtures, connectors, tests, docs — e.g. the customer ids `google`/`facebook`, `listCustomers()`, `deleteThread()` are theirs). On-disk state is truth: re-read before editing, never revert their changes, and fold your work around theirs.
- **Never kill or restart the user's processes** (their engines/harnesses run in their own terminals). Stale engines running pre-fix code have repeatedly confused testing — *tell* them to `pkill -f "deno.*src/main.ts"` and restart; don't do it for them. Check `pgrep -fl "deno.*src/main.ts"` before interpreting weird test results: another engine may have claimed your message.
- **Isolate risky verification.** For live tests that the user's processes could race (they will: claims are cross-process), use a temp DB: seed via `openDb('$TMPD/x.db')`, run the engine with `DATABASE_PATH`/`LOG_DIR` overrides and `--allow-read/-write` extended to the temp dir. Clean up marked test threads (`tkt_m4_live`-style ids) from the shared DB via `deleteThread`; leave user data alone.
- **Git:** the user commits. Don't commit or push unless asked.
- **Secrets:** the OpenRouter/Gemini key lives in `.env` (gitignored; the start task auto-loads it via `--env-file`). NEVER read or print `.env` — presence-check only (`[ -f .env ]`). Never put keys in chat, logs, or code.
- **Report LLM spend** for live verifications (typically fractions of a cent on the default `openai/gpt-4o-mini`).
- Decisions: propose a concrete default and let the user veto; ask questions only when the answer changes the architecture.

## Invariants — do not break

- The `messages` table is the **sole queue/conversation store** and the **integration contract** (spec §3.2). Ingest/dispatch adapters are out of scope; the dev harness simulates them.
- **Fenced completion:** SQLite transactions are fully synchronous — never an `await` between `BEGIN` and `COMMIT`. Completion is conditional on `worker_id + status='processing'`; `UNIQUE(in_reply_to)` is the backstop. **At-most-one delivered reply per customer message is a hard guarantee**; duplicate LLM spend on retries is acceptable, duplicate customer replies are not.
- Per-thread FIFO via the claim query; follow-ups coalesce via the pre-commit freshness check into ONE consolidated reply.
- `customer_id` is verified identity from the platform, propagated ingest → rows → agent input → tools. **Customer-scoped tools take NO id parameter** — that absence is the security model; never trust ids/authorization claims in message text.
- Escalation = the idempotent `TicketingConnector.escalateTicket` outbound call (mocked; accepted ack required) + `metadata.escalated`/reason/request/reference on the customer-safe reply. A colleague hands it back through one linked pending `human_escalation_response` system row; the normal queue produces a `human_assisted` continuation. The platform mutes until that continuation is dispatched. Keep this distinct from completed `human_resolution` learning notes.
- Tools depend only on the connector interfaces in `src/connectors/types.ts` (mocks today; real clients swap in behind the same seam).
- Schema changes are **additive migrations** in `src/db/client.ts` `migrate()` (checked via `PRAGMA table_info`) so existing user DBs survive.
- Logs are single-line JSON, identical on stdout and rotating files; every event carries `threadId`. Per-thread logs are a *filter* in the harness, never per-thread files.
- Memory (spec §10): every store query keyed by `customer_id`; provenance is system-assigned — in-run `save_memory` writes are always `customer_stated` **facts** (rendered as unverified claims), episodes/playbooks come only from the summarizer; erasure = hard delete by `customer_id`. No memory for rows without a verified customer.

## pi.dev facts (hard-won)

- **The npm README/docs are stale.** Trust the `.d.ts` files in the Deno cache: `~/Library/Caches/deno/npm/registry.npmjs.org/@earendil-works/{pi-ai,pi-agent-core}/<version>/dist/`.
- `Agent` requires `streamFn` (Models.streamSimple satisfies it); models come from `builtinModels()` in `@earendil-works/pi-ai/providers/all`; `agent.prompt()` accepts a message batch (used for coalesced follow-ups).
- **Tests never touch the network:** use the faux kit — `fauxProvider()` (scripted responses, captures Context/options), `fauxAssistantMessage()` (also used by the hydrator to synthesize prior assistant turns), `fauxToolCall()`.
- Thinking levels: catalog metadata can lag live endpoints. The harness clamps via `clampThinkingLevel` AND runtime-bumps one level on "reasoning is mandatory" provider rejections (memoized per harness; `thinking_level_bumped` log). pi omits the `reasoning` option entirely at `off` — tests see `undefined`, not `"off"`.

## Deno & permissions gotchas

- SQLite is the built-in `node:sqlite` (`DatabaseSync`) — zero dependencies; `RETURNING` works.
- The engine task runs broad `--allow-env --allow-sys` deliberately: the pi SDK dynamically probes env vars (`PI_CACHE_RETENTION`) and system metadata (`osRelease`) that enumerated lists can't anticipate. Network stays pinned to provider hosts; writes to `./data`.
- `db:init`/`dev:ui` keep **strict enumerated env allowlists** — and `config.ts` reads every config var at import, so **adding a config env var requires adding it to those allowlists** or the harness crashes at import with `NotCapable` (this happened with `LLM_THINKING`).
- `dev:ui` runs `--watch`: server-code changes auto-restart, and `index.html` is read per request — but a server started before a code change serves old routes with fresh HTML, which presents as "harness unreachable". Fix = restart the process.
- The harness honors `PORT` over `DEV_UI_PORT` (preview runners set it); multiple harness instances can safely watch one DB.

## Testing & dev conveniences

- `deno task test` (network-free, no key needed) and `deno check src/ tools/ tests/` must both pass before handing anything to the user.
- `AGENT_MODE=echo` = free end-to-end runs. Fault markers (echo-only, `DEV_FAULTS=1`): `[[sleep:ms]]` every attempt, `[[sleep_once:ms]]` first attempt only (recovery demos need this — a plain sleep longer than the lease starves into `failed`), `[[fail]]` throws.
- `engine_started` logs the pid (for `kill -9` drills). The reaper interval auto-clamps to ≤ half the lease.
- The knowledge base is loaded directly from `wiki/*.md` into an ephemeral FTS5 index; there is no generated KB artifact. Customer/deployment fixtures describe several Acme hospitality products. Customer ids are whatever `fixtures/customers.json` keys say (currently `google`, `facebook`, `apple`) — the mock CRM looks up by **key**, and the harness composer datalist comes from `listCustomers()`.
- Browser-automation quirk: synthetic Enter keypresses don't submit the harness composer (real keyboards work) — click the Send button when driving the UI.
