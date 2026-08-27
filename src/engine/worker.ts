/**
 * The worker pool — the engine's core processing loop (spec §4). N concurrent
 * pollers claim pending customer messages, hydrate the thread's completed
 * history and (for verified customers) per-customer memory, run the agent
 * harness, fold in follow-ups that arrived mid-run via the pre-commit
 * freshness check so one consolidated reply covers everything, and finish
 * with fenced completion — or the fenced release/fail paths on errors.
 */
import type { DatabaseSync } from "node:sqlite";
import type { AgentHarness } from "../agent/harness.ts";
import { getCompletedThreadHistory, type MessageRecord } from "../db/messages.ts";
import {
  claimNextMessage,
  claimThreadFollowUps,
  completeWithReply,
  markFailed,
  releaseClaim,
} from "../db/queue.ts";
import { logger } from "../logger/index.ts";
import { createMemoryAccess } from "../memory/store.ts";

export interface WorkerMemoryOptions {
  hydrationBudgetTokens: number;
  runWriteCap: number;
  activeCap: number;
}

export interface WorkerOptions {
  workerConcurrency: number;
  pollIntervalMs: number;
  maxRetries: number;
  /** Present = memory enabled; access is built per run for verified customers. */
  memory?: WorkerMemoryOptions;
}

export interface EnginePool {
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
 * N concurrent polling loops over one synchronous SQLite connection. All DB
 * calls are synchronous and transactions never span an await, so loops can
 * interleave only at poll/agent awaits — claim atomicity does the rest.
 */
export function startWorkers(
  db: DatabaseSync,
  harness: AgentHarness,
  options: WorkerOptions,
): EnginePool {
  const abort = new AbortController();

  async function processMessage(workerId: string, claimed: MessageRecord): Promise<void> {
    const startedAt = Date.now();
    logger.info("message_claimed", {
      threadId: claimed.threadId,
      messageId: claimed.id,
      workerId,
      attempt: claimed.attemptCount,
    });
    const extras: MessageRecord[] = [];
    try {
      const history = getCompletedThreadHistory(db, claimed.threadId);
      const runInput = {
        threadId: claimed.threadId,
        customerId: claimed.customerId,
        message: claimed,
        history,
        followUps: extras,
        // Memory only for verified customers with memory enabled (spec §10.1).
        memory: options.memory !== undefined && claimed.customerId !== null
          ? createMemoryAccess(db, {
            customerId: claimed.customerId,
            threadId: claimed.threadId,
            hydrationBudgetTokens: options.memory.hydrationBudgetTokens,
            runWriteCap: options.memory.runWriteCap,
            activeCap: options.memory.activeCap,
          })
          : undefined,
        signal: abort.signal,
      };
      let reply = await harness.run(runInput);

      // Pre-commit freshness check (spec §4.3): fold in customer messages
      // that arrived during generation; repeat until the check comes back
      // empty, so one consolidated reply covers everything.
      while (!abort.signal.aborted) {
        const fresh = claimThreadFollowUps(db, claimed.threadId, workerId, Date.now());
        if (fresh.length === 0) break;
        extras.push(...fresh);
        logger.info("followups_coalesced", {
          threadId: claimed.threadId,
          anchorId: claimed.id,
          workerId,
          messageIds: fresh.map((m) => m.id),
          totalCoalesced: extras.length,
        });
        reply = await harness.run(runInput);
      }

      const responseId = `msg_${crypto.randomUUID()}`;
      const outcome = completeWithReply(db, {
        anchorId: claimed.id,
        threadId: claimed.threadId,
        workerId,
        extraIds: extras.map((m) => m.id),
        reply: { ...reply, id: responseId, metadata: reply.metadata ?? null },
      });
      if (outcome === "committed") {
        logger.info("message_completed", {
          threadId: claimed.threadId,
          messageId: claimed.id,
          responseId,
          workerId,
          model: reply.model,
          tokensIn: reply.tokensIn,
          tokensOut: reply.tokensOut,
          coalescedCount: extras.length,
          totalDurationMs: Date.now() - startedAt,
        });
      } else {
        // Lease lost mid-run: discard the reply, return still-owned claims.
        releaseOwnedClaims(workerId, extras);
        logger.warn("reply_discarded_lost_lease", {
          threadId: claimed.threadId,
          messageId: claimed.id,
          workerId,
          attempt: claimed.attemptCount,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      releaseOwnedClaims(workerId, extras);
      if (claimed.attemptCount >= options.maxRetries) {
        const marked = markFailed(db, claimed.id, workerId, error);
        logger.error("message_failed", {
          threadId: claimed.threadId,
          messageId: claimed.id,
          workerId,
          attempt: claimed.attemptCount,
          error,
          marked,
        });
      } else {
        const released = releaseClaim(db, claimed.id, workerId);
        logger.warn("message_retry_released", {
          threadId: claimed.threadId,
          messageId: claimed.id,
          workerId,
          attempt: claimed.attemptCount,
          error,
          released,
        });
      }
    }
  }

  function releaseOwnedClaims(workerId: string, messages: MessageRecord[]): void {
    for (const message of messages) {
      releaseClaim(db, message.id, workerId);
    }
  }

  async function runLoop(workerId: string): Promise<void> {
    logger.debug("worker_started", { workerId });
    while (!abort.signal.aborted) {
      let claimed: MessageRecord | null = null;
      try {
        claimed = claimNextMessage(db, workerId, Date.now());
      } catch (err) {
        logger.error("claim_error", { workerId, error: String(err) });
      }
      if (claimed === null) {
        // Jitter keeps in-process loops from polling in lockstep.
        await sleep(options.pollIntervalMs * (0.8 + Math.random() * 0.4), abort.signal);
        continue;
      }
      await processMessage(workerId, claimed);
    }
    logger.debug("worker_stopped", { workerId });
  }

  const loops = Array.from(
    { length: options.workerConcurrency },
    (_, i) => runLoop(`worker-${i}-${crypto.randomUUID().slice(0, 8)}`),
  );

  return {
    async stop(): Promise<void> {
      abort.abort();
      await Promise.all(loops);
    },
  };
}
