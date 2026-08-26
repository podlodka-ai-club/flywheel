import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { healthRoutes } from './routes/health.ts';

/**
 * Build a configured Fastify instance without binding a port.
 *
 * Tests import this and use `app.inject()` for in-process HTTP; the network
 * side-effect lives only in `index.ts`.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors);
  await app.register(healthRoutes);

  return app;
}
