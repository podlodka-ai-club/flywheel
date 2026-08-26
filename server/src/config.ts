/**
 * Typed configuration loaded from environment variables.
 *
 * Two keys only. `PGLITE_DATA_DIR` is declared now for a stable env contract
 * though it is unused until the `data-model` change.
 */
export interface Config {
  readonly PORT: number;
  readonly PGLITE_DATA_DIR: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = env.PORT ? Number.parseInt(env.PORT, 10) : 3000;
  if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT: ${env.PORT}`);
  }
  return {
    PORT: port,
    PGLITE_DATA_DIR: env.PGLITE_DATA_DIR ?? './.data',
  };
}

export const config: Config = loadConfig();
