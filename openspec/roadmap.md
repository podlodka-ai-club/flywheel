# triage — Implementation Roadmap

> Track progress through the changes. Each change is implemented in roadmap order.
> After completing a change, mark it done and start the next one.
> Full design: [concept.md](concept.md).

---

## Phase 1: Foundation

Runnable skeleton and schema.

- [x] `foundation` — Repo structure, TypeScript config, Fastify server, health endpoint, CLI entry, Vitest wiring


> **Milestone:** Dev server runs, health endpoint responds, 

## Phase 2: Corpus and transport

Tickets exist, flow through GitHub, and corrections arrive.

- [ ] `ticket-corpus` — Zoho import, domain mapping, tenant/contact fixtures, gold labels, `corpus/secrets.yaml` + lint command validating the four secret properties
- [ ] `wiki-corpus` — 8–15 markdown pages (architecture, ownership, connectors, topologies, severity policy) including the deliberately stale ownership page
- [ ] `github-sync` — Replay scheduler (compressed clock), issue creation, polling, label application, scripted corrections at `t + Δ`

> **Milestone:** A ticket flows corpus → GitHub issue → labels → scripted correction → recorded outcome, unattended.

## Phase 3: Triage loop and baselines

First measurable numbers, before any memory exists.

- [ ] `triage-agent` — Context assembly under a token budget, single structured LLM call emitting per-axis labels, confidence, abstain flag, and mandatory memory citations
- [ ] `wiki-retrieval` — Keyword + embedding retrieval over the wiki markdown (a competent RAG baseline, not a strawman)
- [ ] `scoring` — Gold comparison, run scoring, per-secret pass/fail grid; `cold` and `wiki-rag` baselines locked in

> **Milestone:** `cold` and `wiki-rag` arms produce scored runs and a per-secret grid.

## Phase 4: Memory loop

The agent starts learning.

- [ ] `memory-store` — `memory/lessons.md` / `memory/facts.json` read + write, git commit per update, `snapshot()` / `fork(without)`; narrow read/apply interface
- [ ] `reflector` — Batch error clustering by (axis, confusion pair, similarity), per-cluster lesson proposals, deterministic curator with dedupe and max-edits-per-batch budget
- [ ] `arm-runner` — Arm configuration by enabled context layers; `warm` and `warm-no-wiki` runs; amnesia fork (memory minus one lesson)

> **Milestone:** `warm` run learns the planted secrets; amnesia fork isolates a single lesson's effect.

## Phase 5: Demonstration

Make the result legible.

- [ ] `exam-suite` — Exam ticket runner, per-secret pass/fail across all arms, lesson attribution per exam
- [ ] `dashboard` — React views: ticket stream, memory inspector, run comparison, secret grid, timeline
- [ ] `demo-package` — Exported artifacts: before/after runs, memory diff, secret grid, recorded walkthrough

> **Milestone:** The success criteria in concept.md are demonstrable end-to-end.
