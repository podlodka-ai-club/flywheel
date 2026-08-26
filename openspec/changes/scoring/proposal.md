## Why

Numbers only mean something once they are scored against gold and organized the right way.
At ~200 tickets, aggregate metrics are noise, so the headline output is a **per-secret
pass/fail grid across arms**, not an F1 table. This change also locks in the `cold` and
`wiki-rag` baselines — the honest floor the memory arms are measured against.

## What Changes

- Score any run's `decisions` against `gold`, per axis, producing correctness and abstention
  stats into `outcomes`.
- Build the per-secret grid: for each secret, did the arm get its exam tickets right, and
  which memory item (if any) was cited.
- Add a `run` CLI/service to execute an arm end-to-end over the corpus and persist a `runs`
  row (arm, model, memory snapshot sha, config hash).
- Lock in `cold` (no wiki, no memory) and `wiki-rag` (wiki only) baselines as reproducible runs.
- Surface the cited/retrieved ratio as a first-class metric.

## Capabilities

### New Capabilities
- `run-scoring`: Gold comparison per axis, outcome persistence, and cited-vs-retrieved metrics.
- `secret-grid`: Per-secret pass/fail computation across arms with the citing memory item.

### Modified Capabilities
(none)

## Impact

- New: `server/src/services/eval/{score.ts,grid.ts,run.ts}`, CLI command to run + score an arm.
- Reads `decisions`, `citations`, `gold`, `secrets`; writes `runs`, `outcomes`.
- `cold` and `wiki-rag` are the baselines the later `warm` arms are compared to.
- Depends on `triage-agent` and `wiki-retrieval`. Consumed by `exam-suite` and `dashboard`.
