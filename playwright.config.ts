import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests run against an isolated frontend/backend on dedicated ports (5174 / 3100)
 * so they never collide with a running dev server (5173 / 3000).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run --prefix server dev',
      port: 3100,
      env: { PORT: '3100', PGLITE_DATA_DIR: './data/pglite-e2e' },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run --prefix client dev -- --port 5174',
      port: 5174,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
