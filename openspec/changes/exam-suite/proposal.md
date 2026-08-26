## Why

The exam suite is where the thesis is proven or disproven. It runs the constructed exam
tickets across all arms and produces the per-secret pass/fail grid with lesson attribution —
the artifact that replaces statistical claims the corpus can't support. It is what verifies
success criteria 4, 5, 6 and 7 (the ones the concept calls "the project").

## What Changes

- Run the exam tickets under each arm and collect per-axis correctness.
- Produce the per-secret × arm pass/fail grid, annotating which lesson each `warm` pass cited.
- Verify the flagship cases: an exam correct under `warm` but wrong under both `cold` and
  `wiki-rag`; the stale-wiki ticket right under `warm` and wrong under `wiki-rag`; E-107
  (unseen tenant, shared connector version) right under `warm`.
- Verify amnesia: deleting one lesson breaks exactly the exams attributed to it.
- Emit the grid as structured data for the dashboard and demo package.

## Capabilities

### New Capabilities
- `exam-runner`: Executes exam tickets across all arms and records per-secret outcomes with lesson attribution.
- `attribution-check`: Verifies flagship success criteria and the amnesia causal-attribution result.

### Modified Capabilities
(none)

## Impact

- New: `server/src/services/eval/{exam.ts,attribution.ts}`, CLI command `exam`.
- Reads `secrets`, `gold`, `decisions`, `citations`, `runs`; emits the secret grid.
- Directly validates concept success criteria 3–7.
- Depends on `arm-runner`. Consumed by `dashboard` and `demo-package`.
