# Memory evals — multistep scenarios for the support agent

Controlled experiments on one question: **how well does the agent retrieve facts
learned from earlier ticket resolutions and use them on later tickets?** Each eval
is a multistep *scenario* — a small story spanning several tickets in which the
agent first has the chance to learn something and is later tested on it — run
under a matrix of *configurations* (agent, tools, memory engine).

Scenarios are YAML: human-readable, diffable, trivially serialized. Results are
JSON. Nothing in a scenario depends on the memory engine's internals, so the
same file runs against the built-in `memories` table, mem0, or any other engine
behind the adapter seam (see [Runner](#runner)).

The first example is [scenarios/pos-notes-truncation.yaml](scenarios/pos-notes-truncation.yaml);
this document is its reference.

---

## 1. What we are testing

Three memory use cases, each named by a `kind` on the knowledge items a scenario
declares:

| `kind` | The agent should remember… | Typical test |
|---|---|---|
| `personal` | a fact about *this* customer's setup, history, contacts, constraints | same customer asks something that only their history answers |
| `temporal` | something true *for a while* — an in-flight change, a scheduled window, an ongoing incident | the same question before and after `valid_until` gets different correct answers |
| `undocumented` | a product fact that is true for everyone but absent from the wiki | a *different* customer asks; the answer may cross customers only through the gated shared-knowledge path, and is a documentation candidate |

Every scenario also carries an implicit **isolation** test: customer-specific
knowledge must never surface on another customer's ticket, in any configuration.

## 2. Where knowledge comes from

The customer journey and the step type that emulates each stage:

| Stage (CJM) | Who writes | Step type | Trust |
|---|---|---|---|
| Ticket is created | customer | `customer_message` | claim |
| Agent answers (enough in wiki/memory) | agent | `agent_turn` | — |
| Customer adds context / corrects us | customer | `customer_message` | claim |
| Agent escalates → engineers discuss internally in the agent GUI | engineers | `internal_discussion` | high, but *messy*: contains hypotheses later withdrawn |
| Engineer writes the public answer | engineer | `human_reply` | high — the resolution the customer received |
| Ticket goes idle / is closed | platform | `close_ticket` | — |
| Memory consolidation after idle time | memory engine | `consolidate` | — |

The wiki (`wiki/`, Acme Hotels) was itself derived from the ticket corpus; its README lists the facts deliberately left out so that scenarios keep testing memory rather than lookup — check it before authoring a scenario, and add the scenario's learnable facts to that list.

Reference sources the agent can consult but never learns *from* (they are the
baseline, not memory): the wiki via `search_knowledge_base`, the CRM record, the
deployment record. A scenario's `world` says which are present.

**Corpus note.** The GitHub issues are synthetic Zoho exports: the conversation is
embedded in the issue body (`**Customer:** / **Support:**` turns) and 201 of 250
carry a `**Resolution (synth):**` footer. There are no GitHub comments. So the
customer follow-ups, internal discussions and human replies in a scenario are
*authored in the scenario file*, derived from the issue's conversation and
resolution; `source_issues` keeps the traceability.

## 3. Scenario anatomy

```yaml
id: <kebab-case, unique>            # file name matches
title: <one line>
source_issues: [248]                # GitHub issue numbers this was derived from
tags: [...]                         # free; memory:<kind> tags are conventional

world:        # §3.1  who exists, what the agent can look up, when it starts
knowledge:    # §3.2  what the agent is expected to learn (K1, K2, …)
steps:        # §3.3  the story, in order
probes:       # §3.4  end-of-scenario checks against the memory layer itself
```

### 3.1 `world`

```yaml
world:
  knowledge_base: wiki | none | <path to a wiki directory> # served through the KB connector
  clock: <ISO timestamp>                              # scenario start
  customers:
    <customer_id>:                                    # the verified id the platform attaches
      company: ...
      plan: ...
      notes: ...                                      # any CustomerProfile / CustomerSetup field
```

Customer ids are the eval world's, not `fixtures/customers.json`'s. Fields not
given get runner defaults. A shared world can be pulled in with
`world: { extends: worlds/hotels.yaml, … }` (not needed yet).

### 3.2 `knowledge`

The point of the scenario, stated as facts with ids, before any step:

```yaml
knowledge:
  K1:
    kind: personal | temporal | undocumented
    about: <customer_id> | product
    statement: <one paragraph, the fact as a human would state it>
    source: [<step ids where it first becomes available>]
    valid_until: <ISO date>          # temporal only
    documentation_candidate: true    # undocumented only
```

Steps and probes reference these by id (`uses: [K1]`), so the *same* fact is
judged with the *same* wording everywhere, and a reader sees at a glance what a
scenario is about.

### 3.3 `steps`

Common fields: `id` (unique within the scenario), `type`, `at` (ISO timestamp;
sets the scenario clock, must not go backwards), optional `note` (commentary
for the human reader — the runner ignores it).

**Nothing happens implicitly.** A `customer_message` inserts a row and stops; the
agent runs only when an `agent_turn` says so. That is how a scenario expresses
"after escalation the ticket belongs to a human": it simply schedules no
`agent_turn` on that thread.

| type | fields | effect |
|---|---|---|
| `customer_message` | `thread`, `customer`, `content` | inserts a customer row (`status=pending`) |
| `agent_turn` | `thread`, `expect` | claims the thread's pending message(s) and runs the agent once — follow-ups coalesce exactly as in production |
| `internal_discussion` | `thread`, `messages: [{author, at, content}]` | engineers' internal thread; never customer-visible |
| `human_reply` | `thread`, `author`, `content` | the public answer an engineer sent |
| `close_ticket` | `thread` | the platform closed the ticket |
| `consolidate` | — | the memory engine's end-of-ticket pass at the current clock (flywheel: one summarizer sweep with `now = clock`) |

Content is written in whatever language the customer would use — Russian
scenarios are first-class; rubrics are language-agnostic.

### 3.4 `probes`

Checks against the memory layer directly, run after the last step:

| type | fields | asks the engine adapter |
|---|---|---|
| `memory_recall` | `customer`, `query`, `expect.recalls` / `must_not_recall` / `must_not` | `recall(customer, query)` → text the agent would be shown |
| `documentation_proposals` | `expect.proposes` / `must_not` | `proposals()` → candidates the engine nominated for the shared layer / docs |

An engine that cannot serve a probe reports it as `skipped`, never `fail`, so
engine comparisons stay honest.

## 4. Expectations

`expect` on an `agent_turn` mixes **deterministic** checks (from engine signals
and regexes) with **judged** checks (an LLM judge scoring free text against a
stated fact or rubric). Every key is optional.

| key | checked by | meaning |
|---|---|---|
| `outcome: answer \| ask \| escalate \| close` | escalate: deterministic (`metadata.escalated`); answer/ask/close: judge | the one outcome from the wiki's Escalate-or-Answer decision |
| `tolerated: [..]` | — | outcomes scored *partial* instead of *fail* |
| `tools.called` / `tools.not_called` | deterministic (`tool_executed` log) | tool names |
| `escalation.reason_must: [..]` | deterministic | regexes against the internal escalation reason |
| `reply.must` / `reply.must_not: [..]` | deterministic | quoted `"/regex/flags"` strings (always quoted — `[` inside a bare regex breaks YAML flow lists) or plain substrings (case-insensitive) against the customer-facing reply |
| `reply.rubric` | judge | free-text pass/partial/fail criteria |
| `uses: [K..]` | judge | the reply *conveys* the knowledge statement (any wording, any language) |
| `must_not_use: [K..]` | judge | the reply does not convey it — the isolation check |
| `by_config: [{match, …}]` | — | expectation variants selected by the run configuration; the first matching `match` wins, top-level keys apply to all variants |

Deterministic checks run first and are free; the judge runs only on keys that
need it. Judge verdicts are three-valued (`pass` / `partial` / `fail`) with a
one-line justification, and every judge call is logged with its prompt so a
human can audit a disputed verdict.

## 5. Configurations and results

A run = one scenario × one configuration. Configurations are small YAML files:

```yaml
# evals/configs/flywheel-baseline.yaml
id: flywheel-baseline
agent: { mode: llm, provider: openrouter, model: openai/gpt-4o-mini, thinking: off }
knowledge_base: wiki
memory:
  engine: flywheel          # flywheel | mem0 | none | …
  hydration_budget: 1200
shared_knowledge: disabled       # the M8 layer; `enabled` once it exists; `on`/`off` are avoided because YAML 1.1 parsers (Deno's @std/yaml) read them as booleans
judge: { model: openai/gpt-4o-mini }
```

`by_config.match` selects on these keys. A `memory.engine: none` configuration is
the control: it should fail every `uses:` check and pass every isolation check.

Results go to `evals/results/<run-id>/<scenario>.json` (git-ignored):

```json
{
  "scenario": "pos-notes-truncation", "config": "flywheel-baseline", "startedAt": "…",
  "steps": [
    { "id": "t1-agent", "reply": "…", "outcome": "escalate", "toolCalls": [...],
      "memoryWrites": [...], "checks": [ {"key": "outcome", "verdict": "pass"},
      {"key": "uses:K3", "verdict": "fail", "why": "…"} ], "costUsd": 0.0004 }
  ],
  "probes": [ { "id": "recall-hotel-b", "verdict": "pass", "returned": "…" } ],
  "score": { "pass": 9, "partial": 1, "fail": 2, "skipped": 1 }, "costUsd": 0.006
}
```

Scores are counts, not a single number, on purpose: a scenario is a story, and
which step failed is the finding.

## 6. Runner

`deno task eval --scenario <file> --config <file>` runs **in-process**: a temp
SQLite DB, the real DAL/queue/harness/tools, the real summarizer — but driven
step by step under a scenario clock instead of the poll loop, so runs are
deterministic, race-free with the user's engines, and cheap. The `messages`
table remains the integration contract; the runner is just another platform
adapter, like the dev harness.

Engine seams the runner needs (each a small, additive change):

1. **Connectors take their data as input** — extend `createConnectors({ knowledgeBasePath, customers, deployments })` so eval CRM/deployment worlds are injectable too; `knowledge_base: wiki` already uses the same direct Markdown loader as production.
2. **Persona/domain in the prompt** — `buildSystemPrompt` gets the persona text from the world/config instead of the hardcoded Acme Hotels support blurb.
3. **One more platform-inserted row type** alongside `human_resolution`: `human_reply` (`role=assistant`, `metadata.author`, `in_reply_to=NULL`) for the engineer's public answer. `internal_note` (`role=system`, `metadata.type='internal_note'`, `metadata.author={id,name}`) already exists (spec §3.2 item 7, M5.7): the summarizer distills it and the dev UI has the Team chat pane — but the hydrator deliberately does **not** render it into a run, so `internal_discussion` steps feed memory only.
4. **Memory engine adapter** — `src/memory/engine.ts`: `hydrate(customer)`, `tools()`, `consolidate(thread, now)`, `recall(customer, query)`, `proposals()`. The built-in store + summarizer become the first implementation; mem0 & co. implement the same interface.
5. **Injectable clock** through worker/harness/summarizer (the summarizer already takes `now`).
6. **`processThreadOnce(db, harness, thread, now)`** extracted from the worker's `processMessage` so a turn can be run without the loop.

## 7. Authoring conventions

- Derive threads from real issues; keep the customer's original wording where the corpus has it, translate nothing.
- Put the *wrong* hypothesis into internal discussions when the corpus shows one — the learning target is the conclusion.
- One scenario tests one story; three to five threads is the sweet spot. Cross-customer threads always carry `must_not` on the other customer's name and `must_not_use` on their personal knowledge.
- `at` timestamps are the scenario's calendar; `consolidate` must sit past the engine's idle window.
- Name threads after the source issue (`tkt_248`, `tkt_248_b`) and customers after the corpus (`hotel_b`).
