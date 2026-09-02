/** Fixture-backed stand-ins for external CRM, deployment, and ticketing systems. */
import { logger } from "../logger/index.ts";
import type {
  CrmConnector,
  CustomerProfile,
  CustomerSetup,
  CustomerSummary,
  DeploymentConnector,
  EscalationAck,
  EscalationRequest,
  TicketingConnector,
} from "./types.ts";

const FIXTURES_URL = (name: string) => new URL(`../../fixtures/${name}`, import.meta.url);
const MOCK_LATENCY_MS = 80;

async function simulateRequest<T>(
  connector: string,
  operation: string,
  args: Record<string, unknown>,
  fetchResult: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS * (0.5 + Math.random())));
  const result = await fetchResult();
  logger.info("connector_request", {
    connector,
    operation,
    args,
    mock: true,
    durationMs: Date.now() - startedAt,
  });
  return result;
}

async function readJson<T>(key: string, url: URL, cache: Map<string, unknown>): Promise<T> {
  if (!cache.has(key)) {
    cache.set(key, JSON.parse(await Deno.readTextFile(url)));
  }
  return cache.get(key) as T;
}

const fixtureCache = new Map<string, unknown>();

class MockCrm implements CrmConnector {
  getCustomer(customerId: string): Promise<CustomerProfile | null> {
    return simulateRequest("crm", "getCustomer", { customerId }, async () => {
      const customers = await readJson<CustomerProfile[]>(
        "customers",
        FIXTURES_URL("customers.json"),
        fixtureCache,
      );
      return customers.find((c) => c.customerId === customerId) ?? null;
    });
  }

  listCustomers(): Promise<CustomerSummary[]> {
    return simulateRequest("crm", "listCustomers", {}, async () => {
      const customers = await readJson<CustomerProfile[]>(
        "customers",
        FIXTURES_URL("customers.json"),
        fixtureCache,
      );
      return customers.map((c) => ({
        customerId: c.customerId,
        company: c.company,
        plan: c.plan,
      }));
    });
  }
}

class MockDeployments implements DeploymentConnector {
  getSetup(customerId: string): Promise<CustomerSetup | null> {
    return simulateRequest("deployments", "getSetup", { customerId }, async () => {
      const setups = await readJson<CustomerSetup[]>(
        "deployments",
        FIXTURES_URL("deployments.json"),
        fixtureCache,
      );
      return setups.find((s) => s.customerId === customerId) ?? null;
    });
  }
}

class MockTicketing implements TicketingConnector {
  escalateTicket(request: EscalationRequest): Promise<EscalationAck> {
    // Later: a real API call to the ticketing platform (set ticket state,
    // assign a human). Keep references stable across worker retries, mirroring
    // the idempotency obligation of a production adapter.
    return simulateRequest("ticketing", "escalateTicket", { ...request }, () =>
      Promise.resolve({
        accepted: true,
        externalReference: `esc_${stableReference(request.idempotencyKey)}`,
      }));
  }
}

function stableReference(value: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createMockExternalConnectors(): {
  crm: CrmConnector;
  deployments: DeploymentConnector;
  ticketing: TicketingConnector;
} {
  return {
    crm: new MockCrm(),
    deployments: new MockDeployments(),
    ticketing: new MockTicketing(),
  };
}
