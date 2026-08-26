## Why

The result has to be *legible*. The concept's argument is made by showing — a ticket being
triaged, a lesson being born, the same exam flipping from wrong to right across arms — not by
a metrics table. The React dashboard is the surface that makes the memory mechanism and its
behavioural delta visible.

## What Changes

- **Ticket stream** — tickets with predictions, gold, and corrections.
- **Memory inspector** — current `memory/lessons.md` with fire counts and birth tickets.
- **Run comparison** — two arms side by side, differences highlighted.
- **Secret grid** — the demo view: secrets × arms, pass/fail, with the citing lesson.
- **Timeline** — when each lesson was born and the accuracy change around it.
- Add the backend read API endpoints these views consume (runs, decisions, citations,
  secret grid, memory view).

## Capabilities

### New Capabilities
- `dashboard-api`: Fastify read endpoints exposing tickets, runs, decisions, citations, the secret grid, and the memory view.
- `dashboard-ui`: React views — ticket stream, memory inspector, run comparison, secret grid, timeline.

### Modified Capabilities
(none)

## Impact

- New: `server/src/routes/{runs.ts,decisions.ts,grid.ts,memory.ts}`,
  `client/src/{components,hooks,api}/*`, page routes.
- Reads across the whole store plus the memory files; no new writes.
- Playwright E2E covers the secret grid and memory inspector.
- Depends on `scoring`, `exam-suite`, `memory-store`.
