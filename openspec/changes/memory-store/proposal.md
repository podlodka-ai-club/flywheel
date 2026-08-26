## Why

Memory is the deliverable. It is stored as human-readable, git-backed files so that
`git diff` is the observability layer, `git log` answers "which lesson changed which
behaviour", and `git stash`/fork powers the amnesia demo. This change provides the read/write
substrate and the narrow interface that makes arms and the amnesia demo *configuration* rather
than code paths.

## What Changes

- Define and parse the file formats: `memory/lessons.md` (append-only, numbered, mandatory
  `**Not:**` counter-example line, fire/right counters) and `memory/facts.json` (entity →
  learned attributes).
- Expose the narrow memory interface: `read(query) → view`, `apply(deltas)`, `snapshot()`,
  `fork(without)`.
- Commit to git on every `apply`, recording the resulting sha (used as `runs.memory_snapshot`).
- Provide `snapshot()` (current sha) and `fork(without)` (a view with one lesson removed) for
  the amnesia arm.
- Track per-lesson fire and right counts as lessons are used.

## Capabilities

### New Capabilities
- `memory-files`: Parsers/serializers for `lessons.md` and `facts.json`, with the mandatory `**Not:**` line and fire/right counters.
- `memory-interface`: `read`/`apply`/`snapshot`/`fork` over the git-backed files, committing per update and enforcing lesson-format validity.

### Modified Capabilities
(none)

## Impact

- New: `memory/{lessons.md,facts.json}` (created empty), `server/src/services/memory/*`.
- Provides the memory context layer to `triage-agent` and the snapshot sha to `runs`.
- Git commits per apply are the observability + amnesia mechanism; no DB involvement.
- Depends on `foundation`. Consumed by `triage-agent`, `reflector`, and `arm-runner`.
