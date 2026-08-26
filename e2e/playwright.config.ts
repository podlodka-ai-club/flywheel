import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

// Repo root — webServer commands use workspace flags that only resolve there.
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

// Isolated ports, distinct from dev (3000 / 5173), so E2E can run alongside a
// dev instance and won't collide in CI.
const SERVER_PORT = 3100;
const CLIENT_PORT = 5174;
const BASE_URL = `http://localhost:${CLIENT_PORT}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
  },
  webServer: [
    {
      command: 'npm run start --workspace=server',
      cwd: REPO_ROOT,
      env: { PORT: String(SERVER_PORT) },
      url: `http://localhost:${SERVER_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npm run dev --workspace=client',
      cwd: REPO_ROOT,
      env: {
        CLIENT_PORT: String(CLIENT_PORT),
        VITE_PROXY_TARGET: `http://localhost:${SERVER_PORT}`,
      },
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
