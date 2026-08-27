/**
 * Connector seam between support tools and external systems.
 *
 * Tools depend ONLY on these interfaces. The mock implementations
 * (./mock.ts) simulate outbound requests against local fixtures; swapping in
 * real clients (Confluence/Notion wiki, a CRM, a deployment-telemetry API)
 * means implementing the same interfaces — the tools don't change.
 */

export interface KbArticle {
  id: string;
  title: string;
  tags: string[];
  body: string;
}

export interface KbSearchResult {
  article: KbArticle;
  score: number;
}

export interface CustomerProfile {
  customerId: string;
  company: string;
  plan: string;
  status: string;
  seats: number;
  accountManager: string;
  primaryContact: { name: string; email: string };
  contractRenewal: string | null;
  notes: string;
}

/** Directory entry from the CRM's account listing. */
export interface CustomerSummary {
  customerId: string;
  company: string;
  plan: string;
}

export interface CustomerSetup {
  customerId: string;
  product: string;
  version: string;
  channel: string;
  environment: string;
  config: Record<string, string>;
  dependencies: { name: string; version: string }[];
  lastHeartbeat: string;
  knownIssues: string[];
}

/** Documentation base (wiki / Confluence / Notion / …). */
export interface KnowledgeBaseConnector {
  search(query: string, limit: number, signal?: AbortSignal): Promise<KbSearchResult[]>;
}

/** CRM: general account information for a verified customer. */
export interface CrmConnector {
  getCustomer(customerId: string, signal?: AbortSignal): Promise<CustomerProfile | null>;
  /** Account directory (id + display fields), e.g. for identity pickers. */
  listCustomers(signal?: AbortSignal): Promise<CustomerSummary[]>;
}

/** Deployment telemetry: what the customer actually runs. */
export interface DeploymentConnector {
  getSetup(customerId: string, signal?: AbortSignal): Promise<CustomerSetup | null>;
}

export interface EscalationRequest {
  threadId: string;
  /** Verified customer of the ticket (null on unverified tickets). */
  customerId: string | null;
  /** Internal reason — for the human agent, not the customer. */
  reason: string;
}

export interface EscalationAck {
  accepted: boolean;
  /** The ticketing platform's reference for the escalation (case/assignment id). */
  externalReference: string;
}

/**
 * Ticketing platform state changes. The real implementation will call the
 * external system's API (e.g. Zendesk: set ticket state, assign a human);
 * the reply row's metadata.escalated flag (spec §3.2) stays authoritative
 * for the table contract either way.
 */
export interface TicketingConnector {
  escalateTicket(request: EscalationRequest, signal?: AbortSignal): Promise<EscalationAck>;
}

export interface Connectors {
  knowledgeBase: KnowledgeBaseConnector;
  crm: CrmConnector;
  deployments: DeploymentConnector;
  ticketing: TicketingConnector;
}
