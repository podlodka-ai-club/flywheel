/**
 * Runtime connector composition: the local Markdown knowledge base plus the
 * currently fixture-backed external-system connectors.
 */
import { config } from "../config.ts";
import type { Connectors, KnowledgeBaseConnector } from "./types.ts";
import { createMockExternalConnectors } from "./mock.ts";
import { LocalWikiConnector } from "./wiki.ts";

export interface ConnectorOptions {
  knowledgeBase?: KnowledgeBaseConnector;
  knowledgeBasePath?: string;
  knowledgeBaseReload?: boolean;
}

export function createConnectors(options: ConnectorOptions = {}): Connectors {
  return {
    knowledgeBase: options.knowledgeBase ?? new LocalWikiConnector(
      options.knowledgeBasePath ?? config.knowledgeBasePath,
      {
        reloadOnChange: options.knowledgeBaseReload ??
          config.knowledgeBaseReload,
      },
    ),
    ...createMockExternalConnectors(),
  };
}
