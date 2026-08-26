## Why

This is where learning happens. After a batch of corrections, the reflector turns errors
into lessons — but naively, per-ticket reflection produces lessons that quote one ticket and
never fire again, and over-broad lessons over-fire and make the agent *worse*. So reflection
is per error-cluster (≥2 members), and a deterministic curator gates every edit. This
discipline is what makes memory a net improvement rather than noise.

## What Changes

- After each batch of N tickets, cluster corrections by (axis, confusion pair, similarity).
- Reflect **per cluster with ≥2 members**, emitting structured `add | update | delete`
  lesson proposals (each with the mandatory `**Not:**` counter-example).
- Add a deterministic curator that applies proposals: dedupe by trigger similarity, enforce a
  max-edits-per-batch budget, reject malformed proposals.
- Apply accepted deltas through the `memory-interface` (`apply`), producing a git commit and
  new snapshot.

## Capabilities

### New Capabilities
- `error-clustering`: Batch clustering of corrections by axis, confusion pair, and similarity, yielding clusters of ≥2 for reflection.
- `lesson-proposals`: Per-cluster generation of structured add/update/delete lesson proposals.
- `curator`: Deterministic gate that dedupes, budgets, validates, and applies proposals via the memory interface.

### Modified Capabilities
(none)

## Impact

- New: `server/src/services/memory/{reflect.ts,cluster.ts,curator.ts}`.
- Reads `decisions`/`outcomes`/`corrections`; writes lessons via `memory-interface` (git commits).
- The curator's budget and dedupe are deterministic and unit-tested — they underpin trust in
  the memory diff.
- Depends on `memory-store` and `scoring` (outcomes). Consumed by `arm-runner`.
