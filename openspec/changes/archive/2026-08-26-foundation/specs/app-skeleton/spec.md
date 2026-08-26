## ADDED Requirements

### Requirement: Fastify application factory

The system SHALL expose a `buildApp()` factory that constructs and returns a configured
Fastify instance without binding to a network port, so the application can be exercised
in-process by tests via `app.inject()`.

#### Scenario: Factory returns an injectable app

- **WHEN** a test calls `buildApp()` and issues an in-process request to `GET /api/health`
- **THEN** it receives a `200` response without any TCP port being opened

#### Scenario: Factory is side-effect free

- **WHEN** `buildApp()` is called
- **THEN** no server begins listening and no port is bound until a caller invokes `listen()`

### Requirement: Health endpoint

The system SHALL respond to `GET /api/health` with HTTP `200` and a JSON body
`{ "status": "ok" }`. The route MUST be registered as a Fastify plugin rather than an inline
handler.

#### Scenario: Health check succeeds

- **WHEN** a client sends `GET /api/health`
- **THEN** the response status is `200` and the JSON body equals `{ "status": "ok" }`

### Requirement: Server entry point

The system SHALL provide a server entry (`server/src/index.ts`) that reads configuration,
calls `buildApp()`, and starts listening on the configured port. Startup MUST log the bound
address.

#### Scenario: Server starts and serves health

- **WHEN** the server entry is run with default configuration
- **THEN** the process listens on the configured port and `GET /api/health` returns `200`

### Requirement: CORS enabled

The system SHALL enable CORS on the Fastify instance so that direct browser or test API calls
to the backend origin are not blocked.

#### Scenario: Cross-origin request is permitted

- **WHEN** a request to `GET /api/health` includes an `Origin` header from another origin
- **THEN** the response includes the appropriate `Access-Control-Allow-Origin` header

### Requirement: Configuration and environment loading

The system SHALL load configuration from environment variables through a typed `config.ts`
module, providing `PORT` (default `3000`) and `PGLITE_DATA_DIR` (default `./.data`), and MUST
document the contract in `.env.example`. `PGLITE_DATA_DIR` is declared now for a stable env
contract though it is unused until the `data-model` change.

#### Scenario: Defaults apply when env is unset

- **WHEN** neither `PORT` nor `PGLITE_DATA_DIR` is set in the environment
- **THEN** `config` resolves `PORT` to `3000` and `PGLITE_DATA_DIR` to `./.data`

#### Scenario: Environment overrides defaults

- **WHEN** `PORT` is set to `4000` in the environment
- **THEN** `config.PORT` resolves to `4000` and the server listens on `4000`
