## Why

The experiment is a comparison across arms, and its validity depends on one rule: arms differ
only by which context layers are enabled, never by forked agent code. This change is the
single code path, several configurations — including the `amnesia` fork that removes exactly
one lesson to establish causal attribution for that lesson.

## What Changes

- Define arm configurations by enabled context layers:
  - `cold` (—/—), `wiki-rag` (wiki/—), `warm` (wiki/memory), `warm-no-wiki` (—/memory),
    `amnesia` (wiki/memory minus one lesson).
- Run `warm` and `warm-no-wiki` end-to-end: replay corpus, reflect in batches, score.
- Run the `amnesia` arm using `memory-interface.fork(without)` to drop a single lesson and
  re-run the affected exams.
- Record each run's `arm`, `model`, `config_hash`, and `memory_snapshot` for reproducibility.
- Guarantee no per-arm branching in agent code (config only).

## Capabilities

### New Capabilities
- `arm-config`: Declarative arm definitions mapping each arm to its enabled context layers and memory fork.
- `arm-execution`: Runner that executes an arm over the corpus (with batched reflection for warm arms) and persists a reproducible `runs` row.

### Modified Capabilities
(none)

## Impact

- New: `server/src/services/eval/{arms.ts,armRun.ts}`, CLI command `run-arm <arm>`.
- Composes `triage-agent`, `wiki-retrieval`, `memory-store`, `reflector`, and `scoring`.
- The amnesia fork is pure configuration via `fork(without)` — no code path change.
- Depends on `scoring`, `memory-store`, `reflector`. Consumed by `exam-suite`.
