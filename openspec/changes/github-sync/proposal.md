## Why

The agent triages real GitHub Issues, not database rows — that is what makes the loop a
live system rather than a batch script. This change is the transport: it replays corpus
tickets into GitHub as issues on a compressed clock, applies labels, and injects the
scripted human corrections that memory later learns from. Without it there is no unattended
ticket → labels → correction → outcome flow (success criterion 1).

## What Changes

- Add a replay scheduler with a compressed clock (`×N` speed) that emits corpus tickets in
  their intended order and cadence.
- Create GitHub issues from corpus tickets via Octokit (title, body, tenant/contact refs).
- Poll for new/updated issues and apply per-axis labels (team, severity, `needs-info`,
  `known-issue:<id>`) via the API.
- Post an explanatory comment on each triaged issue citing which memory items were used.
- Apply scripted corrections as label edits at `t + Δ`, and record the resulting outcome.
- Make the transport mockable so unit/integration tests never hit the real GitHub API.

## Capabilities

### New Capabilities
- `replay-scheduler`: Compressed-clock scheduler that releases corpus tickets and their scripted corrections in order.
- `github-transport`: Octokit-based issue creation, polling, label application, and explanatory comments (with an injectable fake for tests).

### Modified Capabilities
(none)

## Impact

- New: `server/src/services/sync/{scheduler.ts,github.ts,corrections.ts}`, CLI command to
  start a replay.
- Writes `outcomes` (and updates `decisions`/`citations` linkage) as corrections land.
- Env: `GITHUB_TOKEN`, target repo config. Corrections timing comes from corpus gold
  (`correction_delay_hours`).
- Depends on `ticket-corpus` and `data-model`. Consumed by `arm-runner` and `exam-suite`.
