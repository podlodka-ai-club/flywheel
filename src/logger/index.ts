import { config } from "../config.ts";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export type LogFields = Record<string, unknown>;

function emit(level: LogLevel, event: string, fields: LogFields): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[config.logLevel]) return;
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  }));
}

export const logger = {
  debug: (event: string, fields: LogFields = {}) => emit("debug", event, fields),
  info: (event: string, fields: LogFields = {}) => emit("info", event, fields),
  warn: (event: string, fields: LogFields = {}) => emit("warn", event, fields),
  error: (event: string, fields: LogFields = {}) => emit("error", event, fields),
};
