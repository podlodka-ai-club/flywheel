/** Ranked, local knowledge-base connector over the repository's Markdown wiki. */
import { DatabaseSync } from "node:sqlite";
import { logger } from "../logger/index.ts";
import {
  loadWikiCorpus,
  type WikiCorpus,
  wikiSourceStamp,
} from "../knowledge/wiki.ts";
import type {
  KbArticle,
  KbSearchResult,
  KnowledgeBaseConnector,
} from "./types.ts";

const QUERY_MAX_CHARS = 500;
const QUERY_MAX_TERMS = 16;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "before",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "me",
  "my",
  "not",
  "of",
  "on",
  "or",
  "our",
  "please",
  "should",
  "than",
  "that",
  "the",
  "their",
  "then",
  "there",
  "these",
  "this",
  "to",
  "try",
  "up",
  "us",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

/** Small domain vocabulary; FTS stemming handles morphology, these bridge support phrasing. */
const QUERY_SYNONYMS: Record<string, string[]> = {
  appear: ["display", "load", "open", "show"],
  blank: ["black", "empty"],
  change: ["update"],
  changes: ["update"],
  material: ["content", "media"],
  portal: ["captive", "login"],
  published: ["publish", "update"],
  publishing: ["publish", "update"],
  push: ["publish", "update"],
  pushed: ["publish", "update"],
  retain: ["old", "stale", "update"],
  retained: ["old", "stale", "update"],
  screen: ["display", "monitor", "tv"],
  screens: ["display", "monitor", "tv"],
  television: ["tv"],
  televisions: ["tv"],
  visible: ["appear", "display", "show"],
  wireless: ["wifi"],
  yesterday: ["old", "stale"],
};

interface QueryGroup {
  original: string;
  terms: string[];
  fts: string;
}

interface CandidateRow {
  rowid: number | bigint;
  id: string;
  title: string;
  tags: string;
  body: string;
  page: string;
  source: string;
  rank: number;
}

interface SearchOutcome {
  results: KbSearchResult[];
  candidateCount: number;
  queryTermCount: number;
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en").replace(
    /\bwi[\s-]?fi\b/giu,
    "wifi",
  );
}

function tokenize(value: string): string[] {
  return [...normalizeText(value).matchAll(/[\p{L}\p{N}]+/gu)]
    .map((match) => match[0])
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function quoteFtsPrefix(term: string): string {
  // Terms have already been reduced to Unicode letters/numbers. Quoting keeps
  // every model-provided character out of FTS5's query grammar.
  return `"${term.replaceAll('"', '""')}"*`;
}

function queryGroups(query: string): QueryGroup[] {
  const originals = [...new Set(tokenize(query))].slice(0, QUERY_MAX_TERMS);
  return originals.map((original) => {
    const terms = [...new Set([original, ...(QUERY_SYNONYMS[original] ?? [])])];
    return { original, terms, fts: terms.map(quoteFtsPrefix).join(" OR ") };
  });
}

function containsTerm(tokens: string[], term: string): boolean {
  return tokens.some((token) =>
    token.startsWith(term) || (term.length > 3 && term.startsWith(token))
  );
}

function fieldBoost(row: CandidateRow, groups: QueryGroup[]): number {
  const title = tokenize(row.title);
  const tags = tokenize(row.tags);
  const body = tokenize(row.body);
  let score = 0;
  for (const group of groups) {
    if (group.terms.some((term) => containsTerm(title, term))) score += 5;
    else if (group.terms.some((term) => containsTerm(tags, term))) score += 3;
    else if (group.terms.some((term) => containsTerm(body, term))) score += 1;
  }
  return score;
}

function rowArticle(row: CandidateRow): KbArticle {
  return {
    id: row.id,
    title: row.title,
    tags: row.tags.split("\u001f").filter(Boolean),
    body: row.body,
    page: row.page,
    source: row.source,
  };
}

class WikiSearchIndex {
  private readonly db = new DatabaseSync(":memory:");
  private readonly byId = new Map<string, KbArticle>();

  constructor(readonly corpus: WikiCorpus) {
    this.db.exec(`
      CREATE VIRTUAL TABLE kb USING fts5(
        id UNINDEXED,
        title,
        tags,
        body,
        page UNINDEXED,
        source UNINDEXED,
        tokenize = 'porter unicode61 remove_diacritics 2'
      )
    `);
    const insert = this.db.prepare(
      "INSERT INTO kb (id, title, tags, body, page, source) VALUES (?, ?, ?, ?, ?, ?)",
    );
    this.db.exec("BEGIN");
    try {
      for (const item of corpus.articles) {
        insert.run(
          item.id,
          item.title,
          item.tags.join("\u001f"),
          item.body,
          item.page,
          item.source,
        );
        this.byId.set(item.id.toLocaleLowerCase("en"), item);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      this.db.close();
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }

  search(query: string, requestedLimit: number): SearchOutcome {
    const trimmed = query.trim();
    const limit = Math.max(1, Math.min(5, Math.trunc(requestedLimit) || 3));
    if (trimmed === "" || trimmed.length > QUERY_MAX_CHARS) {
      return { results: [], candidateCount: 0, queryTermCount: 0 };
    }

    const exact = this.byId.get(trimmed.toLocaleLowerCase("en"));
    if (exact !== undefined) {
      return {
        results: [{ article: exact, score: 100 }],
        candidateCount: 1,
        queryTermCount: 1,
      };
    }

    const groups = queryGroups(trimmed);
    if (groups.length === 0) {
      return { results: [], candidateCount: 0, queryTermCount: 0 };
    }
    const fts = groups.map((group) => `(${group.fts})`).join(" OR ");
    // The corpus is deliberately small, so keep a broad candidate window.
    // An OR query over a frequent product word (for example "TV") can
    // otherwise crowd a highly relevant troubleshooting entry out before the
    // stricter concept-coverage reranker gets to inspect it.
    const candidateLimit = 100;
    const candidates = this.db.prepare(`
      SELECT rowid, id, title, tags, body, page, source,
             bm25(kb, 0.0, 8.0, 3.0, 1.0, 0.0, 0.0) AS rank
      FROM kb
      WHERE kb MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(fts, candidateLimit) as unknown as CandidateRow[];
    if (candidates.length === 0) {
      return { results: [], candidateCount: 0, queryTermCount: groups.length };
    }

    // Ask FTS5 which original-term groups each candidate matched. This keeps
    // coverage consistent with its Porter stemming instead of reimplementing
    // a stemmer in TypeScript.
    const groupMatches = groups.map((group) => {
      const rows = this.db.prepare("SELECT rowid FROM kb WHERE kb MATCH ?").all(
        group.fts,
      ) as unknown as {
        rowid: number | bigint;
      }[];
      return new Set(rows.map((row) => String(row.rowid)));
    });
    // Multi-term support questions should match most of their concepts. This
    // prevents a generic pair such as "machine" + "procedure" from turning an
    // unrelated page into documentation for an otherwise unknown topic.
    const requiredMatches = groups.length === 1
      ? 1
      : Math.max(2, Math.ceil(groups.length * 0.6));
    const normalizedPhrase = normalizeText(trimmed).replace(
      /[^\p{L}\p{N}]+/gu,
      " ",
    ).trim();
    const ranked: KbSearchResult[] = [];
    for (const row of candidates) {
      const matched = groupMatches.reduce(
        (count, matches) => count + (matches.has(String(row.rowid)) ? 1 : 0),
        0,
      );
      if (matched < requiredMatches) continue;
      const coverage = matched / groups.length;
      const titlePhrase = normalizeText(row.title).includes(normalizedPhrase)
        ? 12
        : 0;
      const bodyPhrase = normalizeText(row.body).includes(normalizedPhrase)
        ? 4
        : 0;
      const bm25 = Math.max(0, -Number(row.rank));
      const score = coverage * 20 + fieldBoost(row, groups) + titlePhrase +
        bodyPhrase + bm25;
      ranked.push({ article: rowArticle(row), score });
    }
    ranked.sort((a, b) =>
      b.score - a.score || a.article.id.localeCompare(b.article.id)
    );
    return {
      results: ranked.slice(0, limit),
      candidateCount: candidates.length,
      queryTermCount: groups.length,
    };
  }
}

export interface LocalWikiConnectorOptions {
  /** Reparse and atomically replace the index when Markdown mtimes change. */
  reloadOnChange?: boolean;
  /** Disable connector_request/index lifecycle logs in focused unit tests. */
  logRequests?: boolean;
}

export class LocalWikiConnector implements KnowledgeBaseConnector {
  private index: WikiSearchIndex;
  private readonly reloadOnChange: boolean;
  private readonly logRequests: boolean;

  constructor(
    readonly directory: string,
    options: LocalWikiConnectorOptions = {},
  ) {
    this.reloadOnChange = options.reloadOnChange ?? false;
    this.logRequests = options.logRequests ?? true;
    this.index = new WikiSearchIndex(loadWikiCorpus(directory));
    if (this.logRequests) {
      logger.info("knowledge_base_index_loaded", {
        source: "local_markdown",
        path: directory,
        corpusRevision: this.index.corpus.revision,
        articleCount: this.index.corpus.articles.length,
        pageCount: this.index.corpus.pages.length,
      });
    }
  }

  get revision(): string {
    return this.index.corpus.revision;
  }

  get articleCount(): number {
    return this.index.corpus.articles.length;
  }

  close(): void {
    this.index.close();
  }

  private reloadIfChanged(): void {
    if (!this.reloadOnChange) return;
    const stamp = wikiSourceStamp(this.directory);
    if (stamp === this.index.corpus.sourceStamp) return;
    const replacement = new WikiSearchIndex(loadWikiCorpus(this.directory));
    const previous = this.index;
    this.index = replacement;
    previous.close();
    if (this.logRequests) {
      logger.info("knowledge_base_index_reloaded", {
        source: "local_markdown",
        path: this.directory,
        corpusRevision: replacement.corpus.revision,
        articleCount: replacement.corpus.articles.length,
        pageCount: replacement.corpus.pages.length,
      });
    }
  }

  search(
    query: string,
    limit: number,
    signal?: AbortSignal,
  ): Promise<KbSearchResult[]> {
    if (signal?.aborted) {
      return Promise.reject(
        signal.reason ?? new DOMException("Aborted", "AbortError"),
      );
    }
    const startedAt = performance.now();
    try {
      this.reloadIfChanged();
      const outcome = this.index.search(query, limit);
      if (signal?.aborted) {
        return Promise.reject(
          signal.reason ?? new DOMException("Aborted", "AbortError"),
        );
      }
      if (this.logRequests) {
        logger.info("connector_request", {
          connector: "knowledge_base",
          operation: "search",
          args: { query, limit },
          source: "local_markdown",
          corpusRevision: this.index.corpus.revision,
          candidateCount: outcome.candidateCount,
          resultCount: outcome.results.length,
          queryTermCount: outcome.queryTermCount,
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        });
      }
      return Promise.resolve(outcome.results);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
