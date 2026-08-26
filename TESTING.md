# Testing

The stack has three test tiers. All database access uses **PGLite** so no running
PostgreSQL server is ever required for local development or testing.

## Quick reference

| Tier | Tool | Location | Command |
|------|------|----------|---------|
| Unit (backend) | Vitest | `server/tests/` | `cd server && npx vitest run` |
| Integration (backend) | Vitest + Fastify `inject()` | `server/tests/integration/` | `cd server && npx vitest run` |
| Unit (frontend) | Vitest + Testing Library | `client/src/__tests__/` | `cd client && npx vitest run` |
| E2E | Playwright | `e2e/` | `npx playwright test` |

From the repo root:

```bash
npm test              # backend unit + integration
npm run test:client   # frontend unit
npm run test:e2e      # Playwright E2E
```

## Ports

| Service | Dev | E2E |
|---------|-----|-----|
| Frontend (Vite) | 5173 | 5174 |
| Backend (Fastify) | 3000 | 3100 |

E2E runs on isolated ports so it never collides with a running dev server. Playwright
auto-starts both servers via the `webServer` config in `playwright.config.ts`.

## Backend unit tests

- Co-located under `server/tests/`, mirroring `server/src/`.
- Pure functions (context assembly, curator dedupe, scoring) are tested in isolation.
- The deterministic pieces — curator, scorer, secret lint — must have direct unit coverage;
  they are what make arm comparisons trustworthy.

## Backend integration tests

- Live in `server/tests/integration/`.
- Use Fastify's `app.inject()` against an app built by a `buildApp()` factory (no network
  listen needed) so routes and DB wiring are exercised together.
- Each test gets an **isolated in-memory PGLite instance** (or a temp data dir); never
  share DB state across tests. Rebuild schema via migrations in a `beforeEach`.

## Frontend tests

- Vitest + `@testing-library/react`, jsdom environment (configured in `vite.config.ts`).
- Setup file: `client/src/__tests__/setup.ts` (imports `@testing-library/jest-dom`).

## E2E tests

- Playwright drives the full stack against the isolated E2E ports.
- The E2E backend uses a throwaway PGLite dir (`data/pglite-e2e`, gitignored) seeded from
  the corpus so runs are reproducible.

## Database strategy

- **PGLite for dev/test**, **PostgreSQL for production.** All SQL is PostgreSQL syntax and
  portable between the two — do not use PGLite-only or Postgres-only features.
- The episode/eval store (tickets, runs, decisions, citations, outcomes) is **disposable**
  and rebuildable from `corpus/`. Learned state lives in git-backed files, not the DB.

## Environment variables for test isolation

| Var | Purpose | Example |
|-----|---------|---------|
| `PORT` | Backend listen port | `3100` (E2E) |
| `PGLITE_DATA_DIR` | PGLite data directory (empty/`:memory:` for tests) | `./data/pglite-e2e` |
| `ANTHROPIC_API_KEY` | Model access (mock in unit tests) | — |
| `GITHUB_TOKEN` | Octokit auth (mock in unit tests) | — |

Never hit the real Anthropic API or GitHub in unit/integration tests — inject fakes at the
`agent` and `sync` module boundaries.
