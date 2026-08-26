import { buildApp } from './app.ts';
import { config } from './config.ts';

async function main(): Promise<void> {
  const app = await buildApp();
  const address = await app.listen({ port: config.PORT, host: '0.0.0.0' });
  console.log(`triage server listening on ${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
