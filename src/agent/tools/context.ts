/**
 * Shared per-run context and result helpers for the support tools (spec §6).
 * Each tool lives in its own file next to this one; index.ts assembles the set.
 */
import type { AgentToolResult } from "@earendil-works/pi-agent-core";
import type { Connectors } from "../../connectors/types.ts";
import type { MemoryAccess } from "../../memory/store.ts";

export interface EscalationState {
  escalated: boolean;
  reason?: string;
  /** Concrete question, decision, or action requested from the colleague. */
  request?: string;
  /** Ticketing platform's reference from the escalation call. */
  externalReference?: string;
}

export interface ToolRunContext {
  threadId: string;
  /** Stable queue anchor; used as the outbound escalation idempotency key. */
  messageId: string;
  /** Verified identity from the external platform (spec §3.2) — never from message text. */
  customerId: string | null;
  connectors: Connectors;
  /** Written by escalate_to_human; the harness copies it onto reply metadata. */
  escalation: EscalationState;
  /** Present only for verified customers with memory enabled (spec §10). */
  memory?: MemoryAccess;
}

export function textResult(text: string, details: unknown = {}): AgentToolResult<unknown> {
  return { content: [{ type: "text", text }], details };
}

export function requireCustomer(context: ToolRunContext, toolName: string): string {
  if (context.customerId === null) {
    throw new Error(
      `${toolName} unavailable: this ticket has no verified customer identity attached by the support platform.`,
    );
  }
  return context.customerId;
}
