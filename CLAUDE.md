# CLAUDE.md — Triage Memory

Guidance for AI agents working in this repository.

## What this is

**Triage Memory** is a support-triage agent that pulls B2B support tickets from GitHub
Issues, assigns routing/severity labels, learns from human corrections, and demonstrably
improves on later tickets. It is a **designed experiment**, not a benchmark: a set of
"secrets" (facts to be learned) are specified in advance, teaching tickets reveal them
through corrections, and exam tickets are constructed to be unanswerable without them.

The thesis: memory (accumulated derived verdicts) can answer questions that neither a
static prompt nor RAG over a wiki can. See [openspec/concept.md](openspec/concept.md) for
the full design and [openspec/roadmap.md](openspec/roadmap.md) for the phased plan.

## Spec-driven workflow (OpenSpec)

This project uses **OpenSpec**. Work is organized as *changes* under `openspec/changes/`.
Each change has a `proposal.md`; specs, design, and tasks are added during implementation.

- List changes: `openspec list`
- Show a change: `openspec show <change-name>`
- Check status: `openspec status --change <change-name>`
- Validate: `openspec validate <change-name>`

Implement changes in roadmap order. Do not invent features outside the active change's
proposal — if scope is missing, update the proposal first.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node 20+, TypeScript, **Fastify** |
| Frontend | React 19 + Vite |
| Episode/eval store | **PGLite** (dev/test), PostgreSQL (prod) — PostgreSQL syntax, portable |
| Learned state | **git-backed files** (`memory/lessons.md`, `memory/facts.json`) |
| Model | Anthropic SDK |
| GitHub | Octokit |
| Tests | Vitest (unit/integration), Playwright (E2E) |

## Architecture boundaries

Keep these module boundaries — they make the arm/amnesia comparisons valid:

`corpus` (authoring, import, lint) · `sync` (GitHub transport) · `agent` (context
assembly, decision) · `retrieval` (wiki RAG) · `memory` (files, reflector, curator) ·
`eval` (arms, scoring, exams) · `web` (dashboard).

**Two invariants that must never be violated:**

1. **Single LLM call per ticket.** No multi-step orchestration. Behaviour differences must
   be attributable to *memory*, not to control flow.
2. **Arms differ only by configuration, never by code path.** `cold`, `wiki-rag`, `warm`,
   `warm-no-wiki`, `amnesia` all run the same agent; they toggle which context layers are
   enabled. Never fork the agent per arm.

The memory module exposes a narrow interface — `read(query) → view`, `apply(deltas)`,
`snapshot()`, `fork(without)` — so arms and the amnesia demo are configuration.

## Data model split (deliberate)

- **PGLite** holds what is *recorded* (tickets, runs, decisions, citations, outcomes) —
  append-only, disposable, rebuildable from corpus.
- **Git-backed files** hold what is *learned* (`memory/lessons.md`, `memory/facts.json`).
  The learned state is the deliverable, so it must be diffable and human-readable.
  `git diff` is the observability layer; `git stash` is the targeted-amnesia demo.

## Conventions

- All SQL uses PostgreSQL syntax, portable between PGLite (dev/test) and Postgres (prod).
  Never require a running Postgres server for local dev or tests.
- Lessons in `memory/lessons.md` MUST include a `**Not:**` counter-example line.
- Store `citations` (retrieved vs cited) — it is the core observability signal.
- See [TESTING.md](TESTING.md) for test commands, ports, and DB isolation.

## Dev commands

```bash
npm run dev          # server (3000) + client (5173)
npm test             # server unit/integration (vitest)
npm run test:client  # client unit tests
npm run test:e2e     # Playwright E2E (isolated ports 3100 / 5174)
```
