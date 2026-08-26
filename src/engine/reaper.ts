import type { DatabaseSync } from "node:sqlite";
import { reapExpiredLeases } from "../db/queue.ts";
import { logger } from "../logger/index.ts";

export interface ReaperOptions {
  lockTimeoutMs: number;
  maxRetries: number;
  intervalMs: number;
}

export interface Reaper {
  stop(): Promise<void>;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(() => resolve(), ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

/**
 * Zombie-lease reaper (spec §4.2). Checks at least twice per lease lifetime
 * so an expired lease never lingers a full extra interval beyond necessity.
 */
export function startReaper(db: DatabaseSync, options: ReaperOptions): Reaper {
  const abort = new AbortController();
  const intervalMs = Math.max(50, Math.min(options.intervalMs, options.lockTimeoutMs / 2));

  const loop = (async () => {
    logger.debug("reaper_started", {
      intervalMs,
      lockTimeoutMs: options.lockTimeoutMs,
      maxRetries: options.maxRetries,
    });
    while (!abort.signal.aborted) {
      try {
        const { reclaimed, failed } = reapExpiredLeases(db, {
          now: Date.now(),
          lockTimeoutMs: options.lockTimeoutMs,
          maxRetries: options.maxRetries,
        });
        for (const message of reclaimed) {
          logger.warn("lease_reaped", {
            threadId: message.threadId,
            messageId: message.id,
            attempt: message.attemptCount,
          });
        }
        for (const message of failed) {
          logger.error("message_failed", {
            threadId: message.threadId,
            messageId: message.id,
            attempt: message.attemptCount,
            error: message.error,
            reapedTerminally: true,
          });
        }
      } catch (err) {
        logger.error("reaper_error", { error: String(err) });
      }
      await sleep(intervalMs, abort.signal);
    }
    logger.debug("reaper_stopped", {});
  })();

  return {
    async stop(): Promise<void> {
      abort.abort();
      await loop;
    },
  };
}
