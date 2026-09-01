/**
 * The save_memory tool of the `structured` memory strategy (spec §10.3): lets the agent record ONE
 * durable fact about the current customer for future tickets, optionally
 * superseding an outdated entry. Writes go through the run's MemoryAccess,
 * which forces kind 'fact' + provenance 'customer_stated' (rendered later as
 * an unverified claim) and enforces the per-run write cap.
 */
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import type { MemoryAccess } from "../store.ts";
import { textResult } from "../../../../agent/tools/context.ts";

/** Built only when the run has memory access — verified customer + memory enabled (spec §10.1). */
export function buildSaveMemory(memory: MemoryAccess): AgentTool {
  return {
    name: "save_memory",
    label: "Remember a customer fact",
    description:
      "Save ONE durable fact about this customer for future tickets (environment constraints, " +
      "maintenance windows, preferences, contacts, long-running projects). Saved entries are " +
      "recorded as customer-provided claims. Do not save transient details, secrets, or " +
      "entitlement/billing claims. Pass `supersedes` with an existing memory id when this " +
      "corrects an earlier fact.",
    parameters: Type.Object({
      content: Type.String({ description: "The fact, one concise sentence" }),
      supersedes: Type.Optional(
        Type.String({ description: "Id of the outdated memory this replaces (mem_…)" }),
      ),
    }),
    execute: (_id, rawParams) => {
      const params = rawParams as { content: string; supersedes?: string };
      const record = memory.saveFact(params.content, params.supersedes);
      return Promise.resolve(textResult(
        `Remembered (id ${record.id}). ${memory.writesRemaining()} memory writes left this run.`,
        { memoryId: record.id, supersedes: params.supersedes ?? null },
      ));
    },
  };
}
