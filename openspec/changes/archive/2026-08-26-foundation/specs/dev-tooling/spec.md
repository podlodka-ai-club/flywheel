## ADDED Requirements

### Requirement: Monorepo workspace layout

The system SHALL be organized as an npm-workspaces monorepo with `server/`, `client/`, and
`e2e/` workspaces and a root `package.json`, installable with a single `npm install` at the
root producing one lockfile.

#### Scenario: Single install resolves all workspaces

- **WHEN** `npm install` is run at the repository root
- **THEN** dependencies for `server`, `client`, and `e2e` are installed and one lockfile is produced

### Requirement: Shared TypeScript configuration

The system SHALL provide a shared `tsconfig.base.json` extended by each workspace's
`tsconfig.json`, and a `typecheck` script that runs `tsc --noEmit` without producing build
artifacts.

#### Scenario: Typecheck passes on the skeleton

- **WHEN** `npm run typecheck` is run
- **THEN** the TypeScript compiler reports no errors and emits no build output

### Requirement: Development scripts

The system SHALL provide an `npm run dev` script that starts the backend (port `3000`) and the
frontend (port `5173`) together, running the server through `tsx` without a separate build step.

#### Scenario: Dev script starts both processes

- **WHEN** `npm run dev` is run
- **THEN** the Fastify server is reachable on port `3000` and the Vite dev server on port `5173`

### Requirement: Unit test wiring

The system SHALL wire Vitest for both server and client, exposed as `npm test` (server) and
`npm run test:client` (client).

#### Scenario: Server unit tests run

- **WHEN** `npm test` is run
- **THEN** Vitest executes the server test suite, including the health-endpoint test, and reports results

#### Scenario: Client unit tests run

- **WHEN** `npm run test:client` is run
- **THEN** Vitest executes the client test suite, including the shell render test, and reports results

### Requirement: End-to-end smoke test on isolated ports

The system SHALL provide a Playwright smoke test, exposed as `npm run test:e2e`, that runs
against isolated ports (server `3100`, client `5174`) distinct from the dev ports.

#### Scenario: E2E smoke test verifies health path

- **WHEN** `npm run test:e2e` is run
- **THEN** Playwright boots the app on ports `3100`/`5174` and asserts the health status is visible in the UI

### Requirement: CLI entry stub

The system SHALL provide a CLI entry point (`server/src/cli.ts`) that runs and prints a
help/version surface, reserved as the home for corpus and eval commands added in later changes.

#### Scenario: CLI runs and shows help

- **WHEN** the CLI entry is invoked with no arguments or a help flag
- **THEN** it prints its usage/help output and exits successfully
