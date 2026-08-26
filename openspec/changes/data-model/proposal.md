## Why

Every downstream capability — corpus import, GitHub sync, agent decisions, scoring, and the
dashboard — reads and writes structured episode/evaluation state. That state needs a schema,
migrations, and typed repositories before those features can be built. The store is
deliberately *disposable and rebuildable from corpus*, so it lives in PGLite, separate from
the git-backed learned memory.

## What Changes

- Add PGLite initialization with a data directory configurable for dev/test/E2E isolation.
- Add SQL migrations (PostgreSQL syntax, portable to Postgres) for the concept's tables:
  `tenants`, `contacts`, `tickets`, `gold`, `secrets`, `runs`, `decisions`, `citations`,
  `outcomes`.
- Add a migration runner invoked on server start and in test setup.
- Add typed repositories (one module per table area) exposing narrow query/insert methods.
- Add a seed loader stub that later corpus changes populate (`tickets`, `tenants`,
  `contacts`, `gold`, `secrets` from fixtures).

## Capabilities

### New Capabilities
- `database`: PGLite init, migration runner, and portable PostgreSQL migrations for all nine tables.
- `repositories`: Typed data-access layer over the schema (tenants, contacts, tickets, gold, secrets, runs, decisions, citations, outcomes).

### Modified Capabilities
(none)

## Impact

- New: `server/src/db/{index.ts,migrate.ts,migrations/*.sql}`, `server/src/repositories/*.ts`.
- Schema highlights: `tickets(kind teaching|exam|filler, tenant_id, contact_id, secret_ids[])`,
  `runs(arm, model, memory_snapshot git-sha, config_hash)`, `decisions(predicted jsonb,
  abstained, confidence, tokens, latency_ms)`, `citations(decision_id, memory_id,
  layer wiki|lesson|fact, retrieved, cited)`, `outcomes(correct jsonb per axis, corrected_to)`.
- `citations` carries the core observability signal (retrieved vs cited); index accordingly.
- Depends on `foundation`. No external DB server required at any point.
