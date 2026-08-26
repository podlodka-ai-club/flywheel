import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Ports and proxy target are env-overridable so the E2E harness can run on
// isolated ports (client 5174 → server 3100) alongside a dev instance.
const clientPort = process.env.CLIENT_PORT ? Number(process.env.CLIENT_PORT) : 5173;
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: clientPort,
    proxy: {
      '/api': proxyTarget,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
