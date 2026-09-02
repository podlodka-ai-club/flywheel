/**
 * Mock connectors: behave like clients of external systems — async, with
 * simulated request latency and a `connector_request` log line per call —
 * but answer from local JSON sources. Replaced by real API clients later.
 */
import { logger } from "../logger/index.ts";
import type {
  Connectors,
  CrmConnector,
  CustomerProfile,
  CustomerSetup,
  CustomerSummary,
  DeploymentConnector,
  EscalationAck,
  EscalationRequest,
  KbArticle,
  KbSearchResult,
  KnowledgeBaseConnector,
  TicketingConnector,
} from "./types.ts";

const FIXTURES_URL = (name: string) => new URL(`../../fixtures/${name}`, import.meta.url);
const KNOWLEDGE_BASE_URL = new URL("../../wiki/kb_entries.json", import.meta.url);
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

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);
}

/** Naive term-frequency scoring: title (x3) + tags (x2) + body (x1). */
function scoreArticle(article: KbArticle, queryTokens: string[]): number {
  const title = tokenize(article.title);
  const tags = article.tags.flatMap(tokenize);
  const body = tokenize(article.body);
  let score = 0;
  for (const token of queryTokens) {
    score += title.filter((t) => t.startsWith(token)).length * 3;
    score += tags.filter((t) => t.startsWith(token)).length * 2;
    score += body.filter((t) => t.startsWith(token)).length;
  }
  return score;
}

class MockKnowledgeBase implements KnowledgeBaseConnector {
  search(query: string, limit: number): Promise<KbSearchResult[]> {
    return simulateRequest("knowledge_base", "search", { query, limit }, async () => {
      const articles = await readJson<KbArticle[]>("knowledge_base", KNOWLEDGE_BASE_URL, fixtureCache);
      const queryTokens = tokenize(query);
      return articles
        .map((article) => ({ article, score: scoreArticle(article, queryTokens) }))
        .filter((result) => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    });
  }
}

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
    // assign a human). The mock just acknowledges with a fabricated reference.
    return simulateRequest("ticketing", "escalateTicket", { ...request }, () =>
      Promise.resolve({
        accepted: true,
        externalReference: `esc_${crypto.randomUUID().slice(0, 8)}`,
      }));
  }
}

export function createMockConnectors(): Connectors {
  return {
    knowledgeBase: new MockKnowledgeBase(),
    crm: new MockCrm(),
    deployments: new MockDeployments(),
    ticketing: new MockTicketing(),
  };
}
