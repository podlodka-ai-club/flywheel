## ADDED Requirements

### Requirement: React application shell

The system SHALL provide a minimal React 19 application shell (`client/src/main.tsx`,
`client/src/App.tsx`) that mounts and renders without error.

#### Scenario: Shell renders

- **WHEN** the React app is mounted in a test environment
- **THEN** the `App` component renders without throwing and produces visible content

### Requirement: Health status displayed from backend

The shell SHALL call `GET /api/health` on load and reflect the returned status in the UI, so
the frontend↔backend path is verifiable end-to-end.

#### Scenario: Health status shown when backend responds

- **WHEN** the backend responds to `/api/health` with `{ "status": "ok" }`
- **THEN** the shell displays the `ok` status to the user

### Requirement: Dev-server API proxy

The Vite dev server SHALL proxy requests matching `/api/*` to the backend at
`http://localhost:3000`, so the client uses relative API paths with no hard-coded backend
origin in client code.

#### Scenario: Relative API call is proxied in dev

- **WHEN** the client requests the relative path `/api/health` under the Vite dev server
- **THEN** the request is forwarded to `http://localhost:3000/api/health` and the response is returned
