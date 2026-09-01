/**
 * The archive_memory tool of the `structured` memory strategy (spec §10): lets the agent retire a
 * remembered fact about the current customer that turned out wrong or was
 * withdrawn. Archival goes through the run's MemoryAccess, so it is always
 * fenced to the verified customer — another customer's memory ids miss.
 */
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import type { MemoryAccess } from "../store.ts";
import { textResult } from "../../../../agent/tools/context.ts";

/** Built only when the run has memory access — verified customer + memory enabled (spec §10.1). */
export function buildArchiveMemory(memory: MemoryAccess): AgentTool {
  return {
    name: "archive_memory",
    label: "Forget a customer fact",
    description:
      "Archive a remembered fact that is wrong, withdrawn, or no longer relevant. " +
      "Use the memory id shown in your memory list (mem_…).",
    parameters: Type.Object({
      id: Type.String({ description: "The memory id to archive (mem_…)" }),
    }),
    execute: (_id, rawParams) => {
      const params = rawParams as { id: string };
      const archived = memory.archive(params.id);
      if (!archived) {
        throw new Error(`No active memory "${params.id}" found for this customer.`);
      }
      return Promise.resolve(textResult(`Archived memory ${params.id}.`, { memoryId: params.id }));
    },
  };
}
