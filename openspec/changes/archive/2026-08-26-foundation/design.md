## Context

This is the first change in the project. Nothing runs yet. Every later change —
`data-model`, `ticket-corpus`, `github-sync`, `triage-agent`, `memory-store`, `dashboard` —
assumes a TypeScript monorepo with a startable backend, a frontend shell, and a test runner
already in place. The foundation must exist first and be verifiable end-to-end, but it must
add *only* scaffolding: no database, no domain code, no LLM wiring. Those arrive in their own
changes so that the architecture boundaries (`corpus · sync · agent · retrieval · memory ·
eval · web`) stay legible from the first commit.

The concept imposes constraints the layout must not fight later: a single structured LLM call
per ticket, arms that differ only by configuration, and a CLI that will host corpus/eval
commands. The skeleton anticipates these seams without implementing them.

## Goals / Non-Goals

**Goals:**
- A monorepo with clear `client/` · `server/` · `e2e/` boundaries and a shared TS base config.
- A Fastify app built by a `buildApp()` factory that is testable without binding a port.
- `GET /api/health` returning `{ status: "ok" }`, reachable from the React shell via Vite proxy.
- Vitest wired for both server and client; a Playwright smoke test on isolated ports.
- A CLI entry point (`server/src/cli.ts`) that exists as the home for future commands.
- Config/env loading (`PORT`, `PGLITE_DATA_DIR`) with an `.env.example`.

**Non-Goals:**
- No PGLite schema, migrations, or repositories — that is the `data-model` change.
- No corpus, wiki, GitHub sync, agent, memory, or scoring logic.
- No production deployment, containerization, or CI pipeline.
- No authentication, no persistent storage of any kind.
- The CLI ships as a stub with a help/version surface only — no real subcommands yet.

## Decisions

**D1 — npm workspaces monorepo over a single flat package or Turborepo/Nx.**
A root `package.json` with `workspaces: ["server", "client", "e2e"]` gives independent
dependency sets per boundary while keeping one install and one lockfile. Rationale: the
`server`/`client` split is a hard architecture boundary; workspaces enforce it at the
dependency level without adding a build-orchestrator dependency the project's scale does not
justify. *Alternative considered:* Nx/Turborepo — rejected as operational weight for a ~200-
ticket experiment. *Alternative considered:* single package — rejected because client and
server pull incompatible toolchains (Vite/DOM vs Node).

**D2 — `buildApp()` factory returning a configured Fastify instance, separate from the
listen entry (`index.ts`).** Tests import `buildApp()` and use `app.inject()` (Fastify's
in-process HTTP) — no port binding, no flake. `index.ts` only reads config and calls
`app.listen()`. Rationale: this is the standard Fastify testability pattern and it keeps the
port-side-effect out of every future route test. *Alternative:* boot a real server in tests —
rejected as slow and port-contended.

**D3 — Health route as a registered Fastify plugin (`routes/health.ts`), not an inline
handler.** Even with one route, establishing the plugin-per-route-group convention now means
`data-model` and later changes add routes the same way. Rationale: cheap consistency that
prevents an `app.ts` that accretes inline handlers.

**D4 — Vite dev-server proxy maps `/api/*` to `http://localhost:3000`.** The client calls
`/api/health` as a relative path; the proxy forwards it in dev. Rationale: no hard-coded
backend origin in client code and no CORS dependency in the browser during development. CORS
is still enabled server-side (`@fastify/cors`) for direct API calls and tests.

**D5 — `tsx` for running/watching TypeScript directly in dev; no build step for the server
in this change.** Rationale: fastest inner loop, zero compile config to maintain now. A real
build (`tsc`/`esbuild`) can be added when something needs to ship compiled. *Alternative:*
`ts-node` — `tsx` is faster and needs less config.

**D6 — Isolated E2E ports (server 3100 / client 5174) distinct from dev (3000 / 5173).**
Rationale: Playwright can run while a dev server is up, and CI won't collide. Ports come from
env so the E2E config can override them.

**D7 — Config via a small typed `config.ts` reading `process.env` with defaults, not a
config library.** `PORT` (default 3000) and `PGLITE_DATA_DIR` (default `./.data`) are the
only two keys; `PGLITE_DATA_DIR` is declared now though unused until `data-model`, so the env
contract is stable from the start. *Alternative:* `dotenv`+`convict`/`zod-env` — deferred;
two keys don't warrant it, and `.env.example` documents the contract.

## Risks / Trade-offs

- **[Scaffolding scope-creep — the foundation quietly implements data-model or agent seams.]**
  → Non-Goals list is explicit; `PGLITE_DATA_DIR` is the only forward reference and it is
  config-only. Reviewers reject any domain logic in this change.
- **[Port collisions between dev and E2E, or with other local services.]** → Dev and E2E use
  distinct ports (D6) and all ports are env-overridable via `config.ts`.
- **[`tsx`-only dev with no compiled build hides type errors until test time.]** → `npm test`
  runs Vitest (type-aware via the TS toolchain) and a `typecheck` script (`tsc --noEmit`)
  gives a fast standalone check without emitting artifacts.
- **[React 19 + Vite + testing-library version skew.]** → Pin major versions in
  `client/package.json`; the shell is trivial enough that a smoke render test catches breakage.
- **[Workspace hoisting surprises (a client dep resolved from root).]** → One lockfile, one
  `npm install` at root; document `npm run dev` / `npm test` as the only supported entry points.
