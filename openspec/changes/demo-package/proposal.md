## Why

The hackathon deliverable is a demonstration, not a codebase tour. This change packages the
evidence into a reproducible, self-contained set of artifacts so the result can be shown and
re-run: before/after runs, the memory diff, the secret grid, and a recorded walkthrough. It
is the final proof that the success criteria hold end-to-end.

## What Changes

- Export before/after runs (`cold`/`wiki-rag` vs `warm`) as stored artifacts.
- Export the memory diff (`git diff` of `memory/`) showing the lessons a human reader
  recognizes as the planted secrets.
- Export the secret grid across arms as a shareable artifact.
- Script a reproducible end-to-end run (seed → replay → reflect → exam → export) behind one
  command.
- Produce a recorded walkthrough and a short README mapping each artifact to the success
  criterion it satisfies.

## Capabilities

### New Capabilities
- `demo-export`: One-command reproducible pipeline that regenerates runs, memory diff, and secret grid as stored artifacts.
- `demo-walkthrough`: Packaged narrative (recorded walkthrough + README) mapping artifacts to concept success criteria.

### Modified Capabilities
(none)

## Impact

- New: `demo/` (exported artifacts + README), CLI command `demo:export`.
- Reads runs, grid, and the memory git history; writes only to `demo/`.
- Verifies the full success-criteria set (1–8), including memory surviving a process restart.
- Depends on `exam-suite` and `dashboard`.
