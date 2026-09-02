/**
 * Direct Markdown knowledge-base loader.
 *
 * `wiki/*.md` is the source and runtime corpus. This module validates those
 * pages and turns their heading structure into small in-memory articles for
 * search. It deliberately strips HTML comments so evidence/provenance notes
 * remain authoring metadata and never reach the support agent.
 */
import { basename, extname, join } from "node:path";
import { createHash } from "node:crypto";
import type { KbArticle } from "../connectors/types.ts";

const SKIP_FILES = new Set([
  "README.md",
  "coverage.md",
  "_Sidebar.md",
  "_Footer.md",
]);
const ARTICLE_ID = /^(?:[EQXUK]-\d{3}|T-[A-Z]{2,5}-\d{2})$/;
const EVIDENCE_ID = /\bFW-(\d{3})\b/g;
const META_BLOCK = /^\s*<!-- meta\r?\n([\s\S]*?)\r?\n-->/;
const WIKI_LINK = /\[[^\]]+\]\(([^)]+)\)/g;
const HEADING_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "when",
  "what",
  "into",
  "than",
  "then",
  "your",
  "have",
  "does",
  "not",
  "are",
  "was",
  "were",
  "will",
  "also",
  "asked",
  "only",
  "after",
  "before",
  "still",
  "while",
  "over",
]);

interface PageMeta {
  id: string;
  type: string;
  audience: string;
  tags: string[];
}

export interface WikiPage {
  filename: string;
  page: string;
  title: string;
  raw: string;
}

export interface WikiCorpus {
  articles: KbArticle[];
  pages: WikiPage[];
  /** SHA-256 of ordered source filenames and bytes (shortened for logs). */
  revision: string;
  /** Ticket number -> wiki page names, derived from hidden evidence comments. */
  coverage: Map<number, string[]>;
  sourceStamp: string;
}

export class WikiValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid wiki corpus:\n- ${problems.join("\n- ")}`);
    this.name = "WikiValidationError";
  }
}

function contentFiles(directory: string): Deno.DirEntry[] {
  const files = [...Deno.readDirSync(directory)]
    .filter((entry) =>
      entry.isFile && extname(entry.name).toLowerCase() === ".md" &&
      !SKIP_FILES.has(entry.name)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  if (files.length === 0) {
    throw new WikiValidationError([
      `${directory}: no wiki Markdown pages found`,
    ]);
  }
  return files;
}

/** Cheap mtime/size signature used only to decide whether a dev reload is needed. */
export function wikiSourceStamp(directory: string): string {
  return contentFiles(directory).map((entry) => {
    const stat = Deno.statSync(join(directory, entry.name));
    return `${entry.name}:${stat.size}:${stat.mtime?.getTime() ?? 0}`;
  }).join("|");
}

function readMeta(raw: string, filename: string, problems: string[]): PageMeta {
  const match = raw.match(META_BLOCK);
  if (match === null) {
    problems.push(`${filename}: missing <!-- meta ... --> block`);
    return {
      id: basename(filename, extname(filename)).toLowerCase(),
      type: "page",
      audience: "support",
      tags: [],
    };
  }
  const meta: PageMeta = {
    id: "",
    type: "page",
    audience: "support",
    tags: [],
  };
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key === "tags") {
      meta.tags = value.replace(/^\[/, "").replace(/\]$/, "").split(",")
        .map((tag) => tag.trim()).filter(Boolean);
    } else if (key === "id" || key === "type" || key === "audience") {
      meta[key] = value;
    }
  }
  if (meta.id === "") problems.push(`${filename}: metadata is missing id`);
  return meta;
}

/** Flatten Markdown scaffolding while retaining readable prose and table cells. */
export function flattenWikiMarkdown(markdown: string): string {
  const withoutLinks = markdown.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const withoutComments = withoutLinks.replace(/<!--[^]*?-->/g, "");
  const lines: string[] = [];
  for (const rawLine of withoutComments.split(/\r?\n/)) {
    let line = rawLine.trimEnd();
    if (line.trim() === "") {
      lines.push("");
      continue;
    }
    if (/^\s*\|?\s*:?-{3,}/.test(line)) continue;
    if (line.trimStart().startsWith("|")) {
      line = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|")
        .map((cell) => cell.trim()).filter(Boolean).join(" | ");
    }
    line = line.replace(/^\s*>\s?/, "");
    line = line.replace(/^\s*[-*+]\s+/, "- ");
    line = line.replace(/[*_`]/g, "");
    lines.push(line.trim());
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function headingTags(...values: string[]): string[] {
  const tags: string[] = [];
  for (const value of values) {
    for (const match of value.toLowerCase().matchAll(/[a-z][a-z0-9]+/g)) {
      const word = match[0];
      if (
        word.length > 3 && !HEADING_STOP_WORDS.has(word) && !tags.includes(word)
      ) tags.push(word);
    }
  }
  return tags;
}

function splitLongBody(body: string, limit = 1800): string[] {
  if (body.length <= limit) return [body];
  const parts: string[] = [];
  let current = "";
  for (const paragraph of body.split("\n\n")) {
    if (current !== "" && current.length + paragraph.length + 2 > limit) {
      parts.push(current.trim());
      current = paragraph;
    } else {
      current = current === "" ? paragraph : `${current}\n\n${paragraph}`;
    }
  }
  if (current.trim() !== "") parts.push(current.trim());
  return parts;
}

function evidenceNumbers(raw: string): number[] {
  const found = new Set<number>();
  for (const match of raw.matchAll(EVIDENCE_ID)) found.add(Number(match[1]));
  return [...found];
}

function article(
  id: string,
  title: string,
  tags: string[],
  body: string,
  page: string,
  source: string,
): KbArticle {
  return { id, title, tags, body, page, source };
}

function harvestPage(
  filename: string,
  raw: string,
  problems: string[],
): { page: WikiPage; articles: KbArticle[] } {
  const meta = readMeta(raw, filename, problems);
  const page = basename(filename, extname(filename));
  const titleMatch = raw.match(/^# (.+)$/m);
  if (titleMatch === null || titleMatch.index === undefined) {
    problems.push(`${filename}: missing H1 page title`);
    return { page: { filename, page, title: page, raw }, articles: [] };
  }
  const pageTitle = titleMatch[1].trim();
  const afterTitle = raw.slice(titleMatch.index + titleMatch[0].length);
  const sections = afterTitle.split(/^(?=## )/m);
  const articles: KbArticle[] = [];
  const preamble = flattenWikiMarkdown(sections[0]);
  if (preamble.length > 200) {
    articles.push(article(
      `${meta.id}-intro`,
      pageTitle,
      [...meta.tags],
      preamble,
      page,
      `${pageTitle} — overview`,
    ));
  }

  for (let sectionIndex = 1; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    const sectionTitleMatch = section.match(/^## (.+)$/m);
    if (sectionTitleMatch === null) continue;
    const sectionTitle = sectionTitleMatch[1].trim().replace(/^\d+\.\s*/, "");
    const subsections = section.split(/^(?=### )/m);
    const sectionLead = flattenWikiMarkdown(
      subsections[0].replace(/^## .+\r?\n/, ""),
    );
    if (subsections.length === 1) {
      if (sectionLead.length < 80) continue;
      splitLongBody(sectionLead).forEach((body, partIndex) => {
        const suffix = partIndex === 0
          ? ""
          : `-${String.fromCharCode(97 + partIndex)}`;
        articles.push(article(
          `${meta.id}-s${sectionIndex}${suffix}`,
          `${pageTitle}: ${sectionTitle}`,
          [...meta.tags, ...headingTags(sectionTitle)],
          body,
          page,
          `${pageTitle} § ${sectionTitle}`,
        ));
      });
      continue;
    }
    if (sectionLead.length >= 200) {
      articles.push(article(
        `${meta.id}-s${sectionIndex}`,
        `${pageTitle}: ${sectionTitle}`,
        [...meta.tags, ...headingTags(sectionTitle)],
        sectionLead,
        page,
        `${pageTitle} § ${sectionTitle}`,
      ));
    }
    for (
      let subsectionIndex = 1;
      subsectionIndex < subsections.length;
      subsectionIndex++
    ) {
      const subsection = subsections[subsectionIndex];
      const subsectionTitleMatch = subsection.match(/^### (.+)$/m);
      if (subsectionTitleMatch === null) continue;
      const subsectionTitle = subsectionTitleMatch[1].trim();
      const subsectionBody = flattenWikiMarkdown(
        subsection.replace(/^### .+\r?\n/, ""),
      );
      if (subsectionBody.length < 40) continue;
      const identifierMatch = subsectionTitle.match(
        /^([A-Z]+-[A-Z0-9]+(?:-\d+)?)\s+[—-]\s+(.+)$/,
      );
      let baseId = `${meta.id}-s${sectionIndex}-${subsectionIndex}`;
      let shortTitle = subsectionTitle;
      if (identifierMatch !== null && ARTICLE_ID.test(identifierMatch[1])) {
        baseId = identifierMatch[1].toLowerCase();
        shortTitle = identifierMatch[2].trim();
      }
      splitLongBody(subsectionBody).forEach((body, partIndex) => {
        const suffix = partIndex === 0
          ? ""
          : `-${String.fromCharCode(97 + partIndex)}`;
        articles.push(article(
          `${baseId}${suffix}`,
          partIndex === 0 ? subsectionTitle : `${subsectionTitle} (cont.)`,
          [...meta.tags, ...headingTags(sectionTitle, shortTitle)],
          body,
          page,
          `${pageTitle} § ${sectionTitle}`,
        ));
      });
    }
  }
  if (articles.length === 0) {
    problems.push(`${filename}: produced no searchable articles`);
  }
  return { page: { filename, page, title: pageTitle, raw }, articles };
}

function validateLinks(pages: WikiPage[], problems: string[]): void {
  const names = new Set(pages.map((page) => page.page));
  for (const page of pages) {
    for (const match of page.raw.matchAll(WIKI_LINK)) {
      let target = match[1].trim();
      if (
        target === "" || target.startsWith("#") ||
        /^[a-z][a-z0-9+.-]*:/i.test(target)
      ) continue;
      target = target.split("#", 1)[0].split("?", 1)[0];
      try {
        target = decodeURIComponent(target);
      } catch {
        problems.push(`${page.filename}: malformed link target "${match[1]}"`);
        continue;
      }
      target = basename(target, extname(target));
      if (target !== "" && !names.has(target)) {
        problems.push(
          `${page.filename}: link to unknown wiki page "${target}"`,
        );
      }
    }
  }
}

export function loadWikiCorpus(directory: string): WikiCorpus {
  const files = contentFiles(directory);
  const problems: string[] = [];
  const pages: WikiPage[] = [];
  const articles: KbArticle[] = [];
  const revision = createHash("sha256");
  for (const entry of files) {
    const raw = Deno.readTextFileSync(join(directory, entry.name));
    revision.update(entry.name).update("\0").update(raw).update("\0");
    const harvested = harvestPage(entry.name, raw, problems);
    pages.push(harvested.page);
    articles.push(...harvested.articles);
  }
  validateLinks(pages, problems);

  const seen = new Map<string, string>();
  for (const item of articles) {
    const previous = seen.get(item.id);
    if (previous !== undefined) {
      problems.push(
        `${item.page}: duplicate article id "${item.id}" (also in ${previous})`,
      );
    }
    seen.set(item.id, item.page);
  }
  if (problems.length > 0) throw new WikiValidationError(problems);

  const coverageSets = new Map<number, Set<string>>();
  for (const page of pages) {
    for (const ticket of evidenceNumbers(page.raw)) {
      const referencedBy = coverageSets.get(ticket) ?? new Set<string>();
      referencedBy.add(page.page);
      coverageSets.set(ticket, referencedBy);
    }
  }
  const coverage = new Map<number, string[]>();
  for (const [ticket, referencedBy] of coverageSets) {
    coverage.set(ticket, [...referencedBy].sort());
  }

  return {
    articles,
    pages,
    revision: revision.digest("hex").slice(0, 16),
    coverage,
    sourceStamp: wikiSourceStamp(directory),
  };
}
