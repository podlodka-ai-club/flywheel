# Triage Memory

> A support-triage agent that learns from its corrections.

A background agent that pulls B2B support tickets from GitHub Issues, assigns routing and
severity labels, learns from how humans correct it, and demonstrably improves on later
tickets. Built to prove one thing: **memory — accumulated derived verdicts from outcomes —
can answer questions that neither a static prompt nor RAG over a wiki can.**

The project is a *designed experiment*, not a benchmark. Facts to be learned ("secrets")
are specified in advance in `corpus/secrets.yaml`; teaching tickets reveal them through
corrections; exam tickets are constructed to be unanswerable without them. The headline
output is a **per-secret pass/fail grid across arms**, not an F1 table.

See [openspec/concept.md](openspec/concept.md) for the full design.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node 20+, TypeScript, Fastify |
| Frontend | React 19 + Vite |
| Episode/eval store | PGLite (dev/test) · PostgreSQL (prod) |
| Learned state | Git-backed files (`memory/lessons.md`, `memory/facts.json`) |
| Model | Anthropic SDK |
| GitHub | Octokit |
| Tests | Vitest (unit/integration) · Playwright (E2E) |

## Getting started

```bash
# 1. Install dependencies (root + workspaces)
npm install
npm install --prefix server
npm install --prefix client

# 2. Run the dev servers (backend :3000, frontend :5173)
npm run dev

# 3. Run tests
npm test              # server unit + integration (vitest)
npm run test:client   # client unit tests
npm run test:e2e      # Playwright E2E (isolated ports)
```

## Project structure

```
client/        React + Vite dashboard (ticket stream, memory inspector, secret grid)
server/        Fastify API, PGLite setup + migrations, services
  src/db/      Database init and SQL migrations
  src/routes/  Route handlers
  src/services/ Business logic (corpus, sync, agent, retrieval, memory, eval)
e2e/           Playwright end-to-end tests
data/pglite/   PGLite database files (gitignored, rebuildable from corpus)
design-system/ Design reference screenshots
openspec/      Spec-driven change proposals, concept, roadmap
```

## Development plan

Work is spec-driven via [OpenSpec](https://github.com/Fission-AI/OpenSpec). See
[openspec/roadmap.md](openspec/roadmap.md) for the phased plan. Start with:

```bash
openspec show foundation
```

## Success criteria (the point of the project)

- At least one exam ticket is correct under `warm` and wrong under **both** `cold` and `wiki-rag`.
- The stale-wiki ticket is wrong under `wiki-rag` and right under `warm` — memory overriding a document.
- E-107 (unseen tenant, shared connector version) is right under `warm` — a learned fact generalizing across tenants.

Full criteria in [openspec/concept.md](openspec/concept.md).
