# Triage Memory — a support-triage agent that learns from its corrections

A background agent that pulls B2B support tickets from GitHub Issues, assigns routing and severity labels, learns from how humans correct it, and demonstrably improves on later tickets. Built for the Hacker Sprint #2 hackathon («Агент, который помнит»), whose focus is **memory mechanisms and the behavioural delta they produce** — not the processing loop.

## The thesis this project exists to prove

Three ways to give an agent knowledge, only one of which is memory:

| Approach | What it can do | What it cannot do |
|---|---|---|
| **Static prompt** | encode policy that never changes | adapt to anything |
| **RAG over a wiki** | recall anything that is written down | know what nobody wrote down; know a document is now wrong |
| **Memory** | accumulate derived verdicts from outcomes | — |

The project is designed so that a measurable slice of triage decisions is **unanswerable from the ticket text and unanswerable from the wiki**, and answerable only from accumulated corrections. Every architectural decision below serves that demonstration.

The sharpest case: one wiki page is deliberately **stale** — it states that the Billing module is owned by the Payments team, when ownership has moved to Platform. RAG retrieves it and is confidently wrong. Memory must override a document to be right.

## Scale and honesty about it

The corpus is ~200 tickets (anonymized Zoho exports, edited for this scenario) plus a small authored wiki. At that size no statistic survives scrutiny: 40 held-out tickets means a 5-point delta is noise.

So this is a **designed experiment, not a benchmark**. Facts to be learned ("secrets") are specified in advance, teaching tickets reveal them through corrections, and exam tickets are constructed to be unanswerable without them. The product surfaces this design explicitly rather than hiding it behind aggregate metrics.

---

## Domain model (fictional B2B product)

The tickets describe a B2B analytics platform sold to enterprise tenants, deployed cloud or on-prem/air-gapped, with data connectors and scheduled exports.

**Owning teams (routing axis):** `data-platform`, `frontend`, `integrations`, `billing`, `infrastructure`, `security`

**Severity axis:** `sev1`–`sev4`

**Additional axes:** `needs-info` (boolean), `known-issue:<id>` (link)

**Tenants** carry: tier, edition, deployment topology, product version, installed connectors. **Contacts** belong to tenants. This state lives in a small fixtures file, not in ticket text — which is the point.

## The secret registry — the core artifact

A declarative file (`corpus/secrets.yaml`) that drives corpus authoring, exam construction, and the demo. Each secret specifies what must be learned, which tickets teach it, which tickets test it, and what cold versus warm behaviour should look like.

```yaml
- id: S1
  name: Northwind vocabulary
  fact: 'Tenant Northwind says "report doesn''t load" for pipeline timeouts'
  correct: team/data-platform
  cold_expected: team/frontend        # plausible and wrong
  in_wiki: false
  teaches: [T-012, T-019, T-031]
  exams:   [E-101, E-102]

- id: S2
  name: Billing ownership moved
  fact: 'Billing moved from Payments to Platform in release 4.2'
  correct: team/infrastructure
  cold_expected: team/billing
  in_wiki: stale                      # wiki asserts the OLD owner
  teaches: [T-044, T-051, T-058]
  exams:   [E-103]

- id: S3
  name: Air-gapped licence errors
  fact: '"Cannot reach licence server" from air-gapped tenants is infra, never security'
  correct: team/infrastructure
  cold_expected: team/security
  in_wiki: false
  teaches: [T-022, T-037]
  exams:   [E-104]

- id: S4
  name: Contact severity calibration
  fact: 'Contact c-3 files everything as sev1; true severity is usually sev3'
  correct: sev3
  cold_expected: sev1
  in_wiki: false
  teaches: [T-008, T-015, T-027, T-040]
  exams:   [E-105]

- id: S5
  name: Connector v2.3 truncation
  fact: 'connector v2.3 + scheduled export silently truncates; affects any tenant on v2.3'
  correct: known-issue:KI-7
  cold_expected: none
  in_wiki: false
  teaches: [T-061, T-072]
  exams:   [E-106, E-107]        # E-107 is a tenant that never filed a teaching ticket
```

A secret is valid only if it satisfies four properties, checked by a lint command:

1. **Not in the ticket text** — otherwise zero-shot solves it.
2. **Not in the wiki** (or deliberately stale there) — otherwise RAG solves it.
3. **Revealed by corrections** — at least two teaching tickets.
4. **Recurring** — at least one exam ticket.

E-107 is the flagship case: a tenant on connector v2.3 that never appears in any teaching ticket. Getting it right requires generalizing a learned fact across tenants by shared deployment attribute — something neither the wiki nor ticket similarity can do.

---

## Capabilities

### 1. Corpus authoring and import
Import anonymized Zoho tickets, map them into the fictional domain, attach tenant and contact references, and mark each as `teaching`, `exam`, or `filler`. Gold labels and correction scripts (what a human "would have" corrected, and when) live alongside. A lint command validates the secret registry against the corpus.

### 2. Wiki corpus
8–15 markdown pages describing the product: architecture overview, team ownership, connector docs, deployment topologies, severity policy. Deliberately incomplete, with one stale page. This is the RAG corpus and the control condition.

### 3. GitHub sync
Push corpus tickets into a GitHub repository as issues on a replay schedule (compressed clock). Poll for new issues, apply labels via the API, post an explanatory comment citing which memory items were used. Corrections arrive as scripted label edits at `t + Δ`.

### 4. Triage agent
One structured LLM call per ticket. Assembles context from configured layers under a token budget, emits labels with per-axis confidence, an abstain flag, and — mandatory — **citations of which memory items it used**. No multi-step orchestration; the loop stays single-call so that behaviour differences are attributable to memory rather than to control flow.

### 5. Wiki retrieval
Simple keyword-plus-embedding retrieval over the wiki markdown. This is the RAG arm and must be *good*, not a strawman: the argument only holds if memory beats a competent retrieval baseline.

### 6. Memory store
Human-readable, git-backed files:

```
memory/
  lessons.md      # append-only, numbered, one block per lesson
  facts.json      # entity → learned attributes
```

Files rather than a database, deliberately: `git diff` is the observability layer, `git log` answers "which lesson changed which behaviour", and `git stash` is the targeted-amnesia demo. At 200 tickets a database would add operational weight and remove the demo's legibility.

Lesson format:

```markdown
## L-003 · routing · scope: tenant:northwind
**When:** Northwind mentions "report doesn't load"
**Do:** route to data-platform, not frontend
**Not:** ordinary render failures at other tenants → frontend
**Born:** T-012, T-019, T-031 · **Fires:** 7 · **Right:** 6
```

The `**Not:**` line is mandatory. Without counter-examples, learned lessons over-fire on anything superficially similar, which is the most common way a memory update makes the agent *worse*.

### 7. Reflector
After each batch of N tickets, cluster the corrections by (axis, confusion pair, similarity), and reflect **per cluster with ≥2 members** rather than per ticket. Per-ticket reflection produces lessons that quote one ticket and never fire again. Emits structured `add | update | delete` proposals; a deterministic curator applies them (dedupe by trigger similarity, enforce a max-edits-per-batch budget, reject malformed).

### 8. Arm runner
One code path, several configurations, selected by which context layers are enabled:

| Arm | Wiki | Memory | Answers |
|---|---|---|---|
| `cold` | — | — | honest floor |
| `wiki-rag` | ✓ | — | *"why not just RAG the wiki?"* |
| `warm` | ✓ | ✓ | the headline |
| `warm-no-wiki` | — | ✓ | how much memory carries alone |
| `amnesia` | ✓ | ✓ minus one lesson | causal attribution for a single lesson |

Never fork the agent code per arm — arms must differ only in configuration, or they stop being comparable.

### 9. Scoring and exam suite
Score any run against gold. Report per-secret: did the agent get the exam tickets right, and which lesson did it cite? The headline output is not an F1 table but a **per-secret pass/fail grid across arms** — legible at 200 tickets in a way that aggregate metrics are not.

### 10. Dashboard (React)
- **Ticket stream** — tickets, predictions, gold, corrections
- **Memory inspector** — current `lessons.md` with fire counts and birth tickets
- **Run comparison** — two arms side by side, differences highlighted
- **Secret grid** — the demo view: secrets × arms, pass/fail, with the citing lesson
- **Timeline** — when each lesson was born, and the accuracy change around it

---

## Architecture

```
corpus/ (yaml + md)  ──import──►  PGLite
                                    │
                          replay scheduler (clock ×N)
                                    │
                              GitHub Issues  ◄──── agent polls
                                    │
                    ┌───────────────┼────────────────┐
                    ▼               ▼                ▼
              context assembler  LLM call      label + comment
                    │                                │
        ┌───────────┼───────────┐                    ▼
        ▼           ▼           ▼            scripted correction at t+Δ
   wiki (RAG)   memory files  tenant                 │
                    ▲          fixtures              ▼
                    │                          outcome recorded
                    └────── curator ◄── reflector ◄──┘
                              (batch, per error cluster)
```

**Backend:** Node 20+, TypeScript, Fastify. **Frontend:** React + Vite. **Store:** PGLite for episodes/runs/decisions; git-backed files for memory. **Model:** Anthropic SDK. **GitHub:** Octokit. **Tests:** Vitest, Playwright for the dashboard.

**Boundaries:** `corpus` (authoring, import, lint) · `sync` (GitHub transport) · `agent` (assembly, decision) · `retrieval` (wiki) · `memory` (files, reflector, curator) · `eval` (arms, scoring, exams) · `web` (dashboard).

The memory module exposes a narrow interface — `read(query) → view`, `apply(deltas)`, `snapshot()`, `fork(without)` — so arms and the amnesia demo are configuration rather than code paths.

---

## Data model

**PGLite** (episodes and evaluation — append-only, disposable, rebuildable from corpus):

- `tickets` — id, kind (`teaching|exam|filler`), tenant_id, contact_id, title, body, created_at, secret_ids[]
- `tenants` — id, name, tier, edition, topology, version, connectors[]
- `contacts` — id, tenant_id, name, role
- `gold` — ticket_id, labels (jsonb), correction_delay_hours
- `runs` — id, arm, model, memory_snapshot (git sha), config_hash, started_at
- `decisions` — id, run_id, ticket_id, predicted (jsonb), abstained, confidence, prompt_tokens, completion_tokens, latency_ms
- `citations` — decision_id, memory_id, layer (`wiki|lesson|fact`), retrieved, cited
- `outcomes` — ticket_id, run_id, correct (jsonb per axis), corrected_to (jsonb), observed_at
- `secrets` — id, name, fact, in_wiki, teaching_ids[], exam_ids[]

`citations` is small and carries most of the observability value: it distinguishes memory that was *retrieved* from memory that was *used*, and a near-zero cited/retrieved ratio is the signal that memory is decorative rather than operative.

**Git-backed files** (memory — the learned state, versioned):

- `memory/lessons.md`, `memory/facts.json`
- `wiki/*.md` — the RAG corpus (fixture, not learned)
- `corpus/*.yaml` — tickets, tenants, secrets (fixture)

Deliberate split: PGLite holds what is *recorded*, git holds what is *learned*. The learned state is the deliverable, so it must be diffable and human-readable.

---

## Roadmap

### Phase 1 — Foundation
Runnable skeleton and schema.
- `foundation` — repo structure, TypeScript config, Fastify server, health endpoint, CLI entry, Vitest
- `data-model` — PGLite schema and migrations for the tables above, seed loader, typed repositories

### Phase 2 — Corpus and transport
Tickets exist, flow through GitHub, and corrections arrive.
- `ticket-corpus` — Zoho import, domain mapping, tenant/contact fixtures, gold labels, `secrets.yaml` + lint command
- `wiki-corpus` — 8–15 markdown pages including the deliberately stale ownership page
- `github-sync` — replay scheduler, issue creation, polling, label application, scripted corrections at `t + Δ`

### Phase 3 — Triage loop and baselines
First measurable numbers, before any memory exists.
- `triage-agent` — context assembly with token budgets, structured single-call decision with citations, abstention
- `wiki-retrieval` — keyword + embedding retrieval over wiki markdown
- `scoring` — gold comparison, run scoring, per-secret grid, `cold` and `wiki-rag` baselines locked in

### Phase 4 — Memory loop
The agent starts learning.
- `memory-store` — `lessons.md` / `facts.json` read and write, git commit per update, snapshot / fork
- `reflector` — batch error clustering, per-cluster lesson proposals, deterministic curator with edit budget
- `arm-runner` — arm configuration, `warm` and `warm-no-wiki` runs, amnesia fork

### Phase 5 — Demonstration
Make the result legible.
- `exam-suite` — exam ticket runner, per-secret pass/fail across arms, lesson attribution
- `dashboard` — ticket stream, memory inspector, run comparison, secret grid, timeline
- `demo-package` — exported artifacts: before/after runs, memory diff, secret grid, recorded walkthrough

---

## Success criteria

The project is complete when all of these hold:

1. A ticket flows from corpus → GitHub issue → labels → correction → recorded outcome, unattended.
2. `memory/lessons.md` contains lessons a human reader recognizes as the planted secrets — the check is recognition, not a metric.
3. The same exam tickets produce different labels under `cold` and `warm`, in the intended direction.
4. At least one exam ticket is correct under `warm` and wrong under **both** `cold` and `wiki-rag`.
5. The stale-wiki ticket is wrong under `wiki-rag` and right under `warm` — memory overriding a document.
6. E-107 (unseen tenant, shared connector version) is right under `warm` — a learned fact generalizing across tenants.
7. Deleting one lesson via `amnesia` breaks exactly the exam tickets attributed to it.
8. Memory survives a process restart.

Criteria 4, 5 and 6 are the project. The rest is scaffolding.

---

## Non-goals

Deliberately excluded to fit two weeks, and excluded on purpose rather than by omission:

- **No vector database, no graph database, no memory engine.** Files and PGLite.
- **No bitemporal validity modelling.** A lesson is current or superseded; that is enough at this scale.
- **No automated acceptance gate for lessons.** Human review of the memory diff, plus arm comparison.
- **No decay, eviction, or token-budget pressure.** The playbook will not grow large enough to matter.
- **No multi-step agent orchestration.** Single call, always.
- **No statistical significance claims.** The corpus cannot support them; the secret grid replaces them.
- **No real customer data.** Anonymized and re-authored fixtures only.

Any of these can be added afterwards if the loop works. None of them can rescue the project if it does not.