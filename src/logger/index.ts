/**
 * Structured logging (spec §7): every event is one JSON line, identical on
 * stdout and the rotating per-process log file (engine.log, dev-ui.log).
 * Exports the `logger` used across the codebase plus configureLogging() /
 * teardownLogging() to attach and detach the file sink; processes that never
 * configure (tests) stay console-only and never touch the filesystem.
 */
import * as log from "@std/log";
import { join } from "node:path";
import { config } from "../config.ts";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

const LEVEL_TO_STD: Record<LogLevel, log.LevelName> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
};

/** Single-line JSON, identical in every sink (spec §7). */
function formatRecord(record: log.LogRecord): string {
  const fields = (record.args[0] ?? {}) as LogFields;
  return JSON.stringify({
    timestamp: record.datetime.toISOString(),
    level: record.levelName.toLowerCase(),
    event: record.msg,
    ...fields,
  });
}

let fileHandler: log.RotatingFileHandler | null = null;

function applySetup(): void {
  const handlers: Record<string, log.BaseHandler> = {
    console: new log.ConsoleHandler(LEVEL_TO_STD[config.logLevel], {
      formatter: formatRecord,
      useColors: false,
    }),
  };
  const names = ["console"];
  if (fileHandler !== null) {
    handlers.file = fileHandler;
    names.push("file");
  }
  log.setup({
    handlers,
    loggers: { default: { level: "DEBUG", handlers: names } },
  });
}

// Console-only until a process names itself via configureLogging()
// (tests never configure, so they never touch the filesystem).
applySetup();

export interface LoggingOptions {
  /** Process name — becomes <dir>/<name>.log (e.g. "engine", "dev-ui"). */
  name: string;
  dir?: string;
  maxBytes?: number;
  backupCount?: number;
  level?: LogLevel;
}

/**
 * Attach a rotating file sink alongside the console. Each process gets its
 * own file (engine.log, dev-ui.log) so rotation is never racing across
 * processes. Rotation: maxBytes per file, backupCount numbered backups.
 * Returns the active log file path.
 */
export function configureLogging(options: LoggingOptions): string {
  const dir = options.dir ?? config.logDir;
  Deno.mkdirSync(dir, { recursive: true });
  const filename = join(dir, `${options.name}.log`);
  teardownLogging();
  fileHandler = new log.RotatingFileHandler(LEVEL_TO_STD[options.level ?? config.logLevel], {
    filename,
    maxBytes: options.maxBytes ?? config.logMaxBytes,
    maxBackupCount: options.backupCount ?? config.logBackupCount,
    mode: "a",
    formatter: formatRecord,
  });
  applySetup();
  return filename;
}

export function flushLogs(): void {
  fileHandler?.flush();
}

/** Flush, close, and detach the file sink (console logging remains). */
export function teardownLogging(): void {
  if (fileHandler === null) return;
  fileHandler.flush();
  fileHandler.destroy();
  fileHandler = null;
  applySetup();
}

function emit(level: LogLevel, event: string, fields: LogFields): void {
  log.getLogger()[level](event, fields);
  // Flush per emit so the harness Logs view (and tail -f) sees lines
  // immediately; volume is low enough that buffering buys nothing.
  fileHandler?.flush();
}

export const logger = {
  debug: (event: string, fields: LogFields = {}) => emit("debug", event, fields),
  info: (event: string, fields: LogFields = {}) => emit("info", event, fields),
  warn: (event: string, fields: LogFields = {}) => emit("warn", event, fields),
  error: (event: string, fields: LogFields = {}) => emit("error", event, fields),
};
