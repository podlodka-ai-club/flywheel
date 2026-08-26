## 1. Monorepo and TypeScript scaffolding

- [x] 1.1 Create root `package.json` with `workspaces: ["server", "client", "e2e"]` and top-level scripts (`dev`, `test`, `test:client`, `test:e2e`, `typecheck`)
- [x] 1.2 Add `tsconfig.base.json` at the root with shared compiler options (strict, Node 20 target, ESM)
- [x] 1.3 Create `server/`, `client/`, and `e2e/` workspace folders, each with a `package.json` and a `tsconfig.json` extending `tsconfig.base.json`
- [x] 1.4 Add root `.gitignore`, `.env.example` (documents `PORT`, `PGLITE_DATA_DIR`), and `.data/` ignore entry
- [x] 1.5 Verify a single `npm install` at the root resolves all workspaces and produces one lockfile

## 2. Fastify server skeleton (app-skeleton)

- [x] 2.1 Add `server` deps: `fastify`, `@fastify/cors`; dev deps `tsx`, `vitest`, `typescript`
- [x] 2.2 Implement `server/src/config.ts` reading `PORT` (default 3000) and `PGLITE_DATA_DIR` (default `./.data`) from env
- [x] 2.3 Implement `server/src/routes/health.ts` as a Fastify plugin serving `GET /api/health` → `{ status: "ok" }`
- [x] 2.4 Implement `server/src/app.ts` `buildApp()` factory: register `@fastify/cors` and the health plugin, return the instance without listening
- [x] 2.5 Implement `server/src/index.ts` entry: read config, call `buildApp()`, `listen()` on the configured port, log the bound address
- [x] 2.6 Implement `server/src/cli.ts` stub entry that prints help/version and exits successfully

## 3. React shell (web-shell)

- [x] 3.1 Add `client` deps: `react`, `react-dom` (v19); dev deps `vite`, `@vitejs/plugin-react`, `vitest`, `@testing-library/react`, `jsdom`
- [x] 3.2 Create `client/index.html`, `client/src/main.tsx` (mount) and `client/src/App.tsx` (shell that fetches `/api/health` and shows status)
- [x] 3.3 Add `client/vite.config.ts` with the React plugin, dev port 5173, and a `/api` → `http://localhost:3000` proxy
- [x] 3.4 Configure Vitest for the client (jsdom environment) in `vite.config.ts` or `vitest.config.ts`

## 4. Test wiring

- [x] 4.1 Add `server/test/health.test.ts` using `buildApp()` + `app.inject()` asserting `200` and `{ status: "ok" }`
- [x] 4.2 Add `server/test/config.test.ts` asserting env defaults and overrides resolve correctly
- [x] 4.3 Add `client/src/App.test.tsx` rendering `App` (mocked `/api/health`) and asserting the `ok` status renders
- [x] 4.4 Add `e2e/playwright.config.ts` on isolated ports (server 3100 / client 5174) with webServer startup
- [x] 4.5 Add `e2e/tests/health.spec.ts` smoke test asserting the health status is visible in the UI

## 5. Verification

- [x] 5.1 Run `npm run typecheck` — no errors, no emitted artifacts
- [x] 5.2 Run `npm test` and `npm run test:client` — all unit tests pass
- [x] 5.3 Run `npm run dev` and confirm `GET /api/health` responds on 3000 and the shell shows `ok` via the 5173 proxy
- [x] 5.4 Run `npm run test:e2e` — Playwright smoke test passes on isolated ports
- [x] 5.5 Run `openspec validate foundation` — change validates clean
