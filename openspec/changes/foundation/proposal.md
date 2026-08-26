## Why

The project needs a runnable skeleton before any feature work: a TypeScript monorepo, a
backend that starts and answers a health check, a frontend shell, and a test runner. Every
later change (data model, corpus, agent, memory, dashboard) builds on this foundation, so it
must exist first and be verifiable end-to-end.

## What Changes

- Establish the monorepo layout: `client/` (React + Vite), `server/` (Fastify), `e2e/`
  (Playwright), shared `tsconfig.base.json`.
- Stand up a Fastify server via a `buildApp()` factory (testable without binding a port),
  with CORS and a `GET /api/health` endpoint returning `{ status: "ok" }`.
- Add a minimal React app shell that renders and calls `/api/health` through a proxy.
- Wire Vitest for server and client, and a Playwright smoke test on isolated ports.
- Add a small CLI entry point (`server/src/cli.ts`) as the home for corpus/eval commands
  added in later changes.
- Provide `.env.example` and config loading (PORT, PGLITE_DATA_DIR).

## Capabilities

### New Capabilities
- `app-skeleton`: Fastify `buildApp()` factory, server entry, CORS, health endpoint, and config/env loading.
- `web-shell`: React + Vite app shell that boots and reads the health endpoint.
- `dev-tooling`: Monorepo scripts, TypeScript project config, Vitest + Playwright wiring, CLI entry stub.

### Modified Capabilities
(none — initial change)

## Impact

- New: `server/src/{index.ts,app.ts,cli.ts,config.ts,routes/health.ts}`,
  `client/src/{main.tsx,App.tsx}`, root/workspace `package.json`, `tsconfig*`,
  `vite.config.ts`, `playwright.config.ts`.
- Dependencies: `fastify`, `@fastify/cors`; dev `tsx`, `vitest`, `typescript`; client
  `react`, `vite`, testing-library.
- Ports: backend 3000, frontend 5173 (E2E 3100 / 5174). No database yet — added in `data-model`.
