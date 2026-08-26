export interface Config {
  databasePath: string;
  lockTimeoutMs: number;
  maxRetries: number;
  logLevel: "debug" | "info" | "warn" | "error";
  devUiPort: number;
  workerConcurrency: number;
  pollIntervalMs: number;
  agentMode: "echo" | "llm";
  reaperIntervalMs: number;
  devFaults: boolean;
  logDir: string;
  logMaxBytes: number;
  logBackupCount: number;
}

function envStr(name: string, fallback: string): string {
  const value = Deno.env.get(name);
  return value === undefined || value === "" ? fallback : value;
}

function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: expected a positive integer, got "${raw}"`);
  }
  return parsed;
}

function envLogLevel(name: string, fallback: Config["logLevel"]): Config["logLevel"] {
  const raw = envStr(name, fallback);
  if (raw !== "debug" && raw !== "info" && raw !== "warn" && raw !== "error") {
    throw new Error(`Invalid ${name}: expected debug|info|warn|error, got "${raw}"`);
  }
  return raw;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = Deno.env.get(name);
  if (raw === undefined || raw === "") return fallback;
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  throw new Error(`Invalid ${name}: expected 1|0|true|false, got "${raw}"`);
}

function envAgentMode(name: string, fallback: Config["agentMode"]): Config["agentMode"] {
  const raw = envStr(name, fallback);
  if (raw !== "echo" && raw !== "llm") {
    throw new Error(`Invalid ${name}: expected echo|llm, got "${raw}"`);
  }
  return raw;
}

export function loadConfig(): Config {
  return {
    databasePath: envStr("DATABASE_PATH", "./data/support.db"),
    lockTimeoutMs: envInt("LOCK_TIMEOUT_MS", 600_000),
    maxRetries: envInt("MAX_RETRIES", 3),
    logLevel: envLogLevel("LOG_LEVEL", "info"),
    devUiPort: envInt("DEV_UI_PORT", 8787),
    workerConcurrency: envInt("WORKER_CONCURRENCY", 2),
    pollIntervalMs: envInt("POLL_INTERVAL_MS", 500),
    // Echo until Milestone 4 delivers the real pi.dev harness.
    agentMode: envAgentMode("AGENT_MODE", "echo"),
    reaperIntervalMs: envInt("REAPER_INTERVAL_MS", 5000),
    // Opt-in [[sleep:ms]] / [[fail]] markers, honored by the echo agent only.
    devFaults: envBool("DEV_FAULTS", false),
    // Under ./data so the existing write permission covers it; gitignored.
    logDir: envStr("LOG_DIR", "./data/logs"),
    logMaxBytes: envInt("LOG_MAX_BYTES", 5_242_880),
    logBackupCount: envInt("LOG_BACKUP_COUNT", 3),
  };
}

export const config: Config = loadConfig();
