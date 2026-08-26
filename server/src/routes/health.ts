import type { FastifyPluginAsync } from 'fastify';

/**
 * Health check route group. Registered as a plugin so later changes add
 * route groups the same way rather than inlining handlers in `app.ts`.
 */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/health', async () => {
    return { status: 'ok' as const };
  });
};
