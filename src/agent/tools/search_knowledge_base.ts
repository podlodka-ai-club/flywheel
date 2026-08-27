/**
 * The search_knowledge_base support tool (spec §6): searches the product
 * documentation through the knowledge-base connector and returns the top
 * matching articles for grounding answers. An empty result returns an
 * explicit "don't guess" instruction instead, so the agent admits gaps or
 * escalates rather than inventing facts.
 */
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { textResult, type ToolRunContext } from "./context.ts";

export function buildSearchKnowledgeBase(context: ToolRunContext): AgentTool {
  return {
    name: "search_knowledge_base",
    label: "Search documentation",
    description:
      "Search the product documentation base (help articles, how-tos, policies, upgrade guides). " +
      "Use for any question about product capabilities, configuration, limits, or procedures.",
    parameters: Type.Object({
      query: Type.String({ description: "Search terms, e.g. 'csv export' or 'api rate limit'" }),
      limit: Type.Optional(
        Type.Number({ description: "Max articles to return (default 3)", minimum: 1, maximum: 5 }),
      ),
    }),
    execute: async (_id, rawParams, signal) => {
      const params = rawParams as { query: string; limit?: number };
      const results = await context.connectors.knowledgeBase.search(
        params.query,
        params.limit ?? 3,
        signal,
      );
      if (results.length === 0) {
        return textResult(
          `No documentation articles matched "${params.query}". Do not guess — say the documentation does not cover it or escalate.`,
          { resultCount: 0 },
        );
      }
      const text = results
        .map(({ article }) => `# ${article.title} [${article.id}]\n${article.body}`)
        .join("\n\n");
      return textResult(text, { resultCount: results.length, ids: results.map((r) => r.article.id) });
    },
  };
}
