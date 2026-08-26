## Why

This is the decision core: one structured LLM call that turns a ticket plus assembled
context into labels. It must be a *single* call with no orchestration, so that any behaviour
difference between arms is attributable to memory rather than control flow. Citations are
mandatory because the whole experiment hinges on distinguishing memory that was *used* from
memory that was merely *retrieved*.

## What Changes

- Add a context assembler that composes the prompt from configurable layers (ticket, tenant
  fixtures, wiki retrieval, memory view) under a token budget.
- Make a single structured Anthropic SDK call per ticket emitting: per-axis labels (team,
  severity, needs-info, known-issue), per-axis confidence, an abstain flag, and **citations
  of which memory items were used**.
- Record each decision and its citations into `decisions` / `citations`.
- Expose the layer configuration as inputs so arms are pure configuration (no per-arm code).
- Provide a fake model client for deterministic tests.

## Capabilities

### New Capabilities
- `context-assembly`: Token-budgeted assembler that selects and orders context layers (ticket, tenant, wiki, memory) per a config.
- `triage-decision`: Single structured LLM call producing per-axis labels, confidence, abstention, and mandatory citations, persisted to `decisions`/`citations`.

### Modified Capabilities
(none)

## Impact

- New: `server/src/services/agent/{assemble.ts,decide.ts,schema.ts,model.ts}`.
- Reads tenant fixtures, wiki retrieval (from `wiki-retrieval`), and the memory view (from
  `memory-store`); both are optional layers so `cold` works with neither.
- Writes `decisions` and `citations` (retrieved vs cited flags).
- Env: `ANTHROPIC_API_KEY`. Enforces the single-call and config-only-arms invariants.
- Depends on `data-model`. The memory/wiki layers are consumed once those changes land.
