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
  llmProvider: string;
  llmModel: string;
  llmThinking: ThinkingLevel;
  memoryEnabled: boolean;
  /** Empty = inherit llmProvider / llmModel for summarization. */
  summarizerProvider: string;
  summarizerModel: string;
  summarizeAfterMs: number;
  memoryHydrationBudget: number;
  memoryRunWriteCap: number;
  memoryActiveCap: number;
}

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
const THINKING_LEVELS: readonly ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

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
    // The real agent is the default from M4 on; AGENT_MODE=echo stays
    // available for key-free regression testing.
    agentMode: envAgentMode("AGENT_MODE", "llm"),
    reaperIntervalMs: envInt("REAPER_INTERVAL_MS", 5000),
    // Opt-in [[sleep:ms]] / [[fail]] markers, honored by the echo agent only.
    devFaults: envBool("DEV_FAULTS", false),
    // Under ./data so the existing write permission covers it; gitignored.
    logDir: envStr("LOG_DIR", "./data/logs"),
    logMaxBytes: envInt("LOG_MAX_BYTES", 5_242_880),
    logBackupCount: envInt("LOG_BACKUP_COUNT", 3),
    llmProvider: envStr("LLM_PROVIDER", "openrouter"),
    // Empty string = the provider's default model (see DEFAULT_LLM_MODELS).
    llmModel: envStr("LLM_MODEL", ""),
    // Auto-clamped to what the model supports: reasoning-mandatory models
    // raise "off" to their minimum, non-reasoning models force "off".
    llmThinking: envThinkingLevel("LLM_THINKING", "off"),
    // Per-customer memory (spec §10)
    memoryEnabled: envBool("MEMORY_ENABLED", true),
    // Summarization is a cheap-model job — point it at a smaller model/provider
    // than the main agent when desired; empty inherits the agent's setting.
    summarizerProvider: envStr("SUMMARIZER_PROVIDER", ""),
    summarizerModel: envStr("SUMMARIZER_MODEL", ""),
    summarizeAfterMs: envInt("SUMMARIZE_AFTER_MS", 86_400_000),
    memoryHydrationBudget: envInt("MEMORY_HYDRATION_BUDGET", 1200),
    memoryRunWriteCap: envInt("MEMORY_RUN_WRITE_CAP", 3),
    memoryActiveCap: envInt("MEMORY_ACTIVE_CAP", 200),
  };
}

function envThinkingLevel(name: string, fallback: ThinkingLevel): ThinkingLevel {
  const raw = envStr(name, fallback);
  if (!THINKING_LEVELS.includes(raw as ThinkingLevel)) {
    throw new Error(`Invalid ${name}: expected ${THINKING_LEVELS.join("|")}, got "${raw}"`);
  }
  return raw as ThinkingLevel;
}

export const config: Config = loadConfig();
