import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { join } from "node:path";
import { LocalWikiConnector } from "../src/connectors/wiki.ts";
import {
  flattenWikiMarkdown,
  loadWikiCorpus,
  WikiValidationError,
} from "../src/knowledge/wiki.ts";
import { renderCoverage } from "../tools/wiki.ts";

const WIKI = "./wiki";

function page(
  id: string,
  title: string,
  entryId: string,
  body: string,
  link = "",
): string {
  return `<!-- meta
id: ${id}
type: product
audience: support
tags: [test, display]
-->
# ${title}

Read this when this synthetic page is needed for a focused parser or search test.

## 1. Troubleshooting

### ${entryId} — Display issue

${body} This paragraph is deliberately long enough to become a searchable article.
<!-- evidence: FW-001 -->
${link}
`;
}

Deno.test("direct Markdown loader validates and chunks the real wiki without leaking evidence", () => {
  assertThrows(
    () => Deno.statSync("./wiki/kb_entries.json"),
    Deno.errors.NotFound,
  );
  const corpus = loadWikiCorpus(WIKI);
  assertEquals(corpus.pages.length, 22);
  assert(corpus.articles.length > 500);
  assertEquals(corpus.coverage.size, 250);
  assert(/^[a-f0-9]{16}$/.test(corpus.revision));
  const item = corpus.articles.find((article) => article.id === "t-tv-09");
  assert(item !== undefined);
  assertEquals(item.page, "Acme-TV");
  assertStringIncludes(item.source, "Acme TV");
  assert(!item.body.includes("<!--"));
  assert(!item.body.includes("evidence:"));
});

Deno.test("Markdown flattening keeps prose/table values and strips links, markup, and comments", () => {
  const text = flattenWikiMarkdown(
    `**Bold** [label](Other)\n\n| A | B |\n|---|---|\n| one | two |\n<!-- secret -->`,
  );
  assertEquals(text, "Bold label\n\nA | B\none | two");
});

Deno.test("wiki validation rejects broken links and duplicate stable article ids", async () => {
  const directory = await Deno.makeTempDir({
    prefix: "flywheel_wiki_invalid_",
  });
  try {
    await Deno.writeTextFile(
      join(directory, "Alpha.md"),
      page(
        "alpha",
        "Alpha",
        "T-TV-01",
        "Alpha orchid diagnostics.",
        "[Missing](Missing)",
      ),
    );
    await Deno.writeTextFile(
      join(directory, "Beta.md"),
      page("beta", "Beta", "T-TV-01", "Beta orchid diagnostics."),
    );
    let error: unknown;
    try {
      loadWikiCorpus(directory);
    } catch (caught) {
      error = caught;
    }
    assert(error instanceof WikiValidationError);
    assertStringIncludes(error.message, "link to unknown wiki page");
    assertStringIncludes(error.message, "duplicate article id");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("local FTS search ranks documentation, handles hostile syntax, limits, misses, and ids", async () => {
  const connector = new LocalWikiConnector(WIKI, { logRequests: false });
  try {
    const results = await connector.search(
      "content not updating on TV after publish",
      3,
    );
    assertEquals(results.length, 3);
    assert(results.some((result) => result.article.id === "t-tv-09"));
    const milestoneResults = await connector.search(
      "I published TV content but the change is not visible — what should I try?",
      3,
    );
    assert(
      milestoneResults.some((result) => result.article.id === "t-tv-09"),
    );
    assert(
      results.every((result) =>
        result.article.page !== "" && result.article.source !== ""
      ),
    );
    assertEquals(
      (await connector.search("t-tv-09", 5))[0].article.id,
      "t-tv-09",
    );
    assertEquals(
      (await connector.search(`guest \" OR * portal`, 2)).length <= 2,
      true,
    );
    assertEquals(await connector.search("the and how to", 3), []);
    assertEquals(await connector.search("quantum blockchain espresso", 3), []);
    assertEquals(await connector.search("x".repeat(501), 3), []);
  } finally {
    connector.close();
  }
});

Deno.test("local connector honors cancellation", async () => {
  const connector = new LocalWikiConnector(WIKI, { logRequests: false });
  const controller = new AbortController();
  controller.abort();
  try {
    await assertRejects(
      () => connector.search("content", 3, controller.signal),
      DOMException,
      "aborted",
    );
  } finally {
    connector.close();
  }
});

Deno.test("development reload atomically replaces the index after a Markdown edit", async () => {
  const directory = await Deno.makeTempDir({ prefix: "flywheel_wiki_reload_" });
  const path = join(directory, "Alpha.md");
  await Deno.writeTextFile(
    path,
    page(
      "alpha",
      "Alpha",
      "T-TV-01",
      "Orchid diagnostics solve the display fault.",
    ),
  );
  const connector = new LocalWikiConnector(directory, {
    reloadOnChange: true,
    logRequests: false,
  });
  try {
    const revision = connector.revision;
    assertEquals(
      (await connector.search("orchid diagnostics", 3))[0].article.id,
      "t-tv-01",
    );
    await Deno.writeTextFile(
      path,
      page(
        "alpha",
        "Alpha",
        "T-TV-01",
        "Saffron diagnostics solve the display fault with a longer replacement.",
      ),
    );
    assertEquals(
      (await connector.search("saffron diagnostics", 3))[0].article.id,
      "t-tv-01",
    );
    assert(connector.revision !== revision);
  } finally {
    connector.close();
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("coverage report is generated directly from Markdown evidence", () => {
  const corpus = loadWikiCorpus(WIKI);
  const rendered = renderCoverage(
    corpus,
    Deno.readTextFileSync(join(WIKI, "coverage.md")),
  );
  assertStringIncludes(rendered, "deno task wiki:check -- --coverage");
  assertStringIncludes(rendered, "| FW-001 |");
  assertStringIncludes(rendered, "**Not referenced (0):** none");
});

Deno.test("retrieval benchmark meets Recall@3 and no-answer precision gates", async () => {
  const fixture = JSON.parse(
    await Deno.readTextFile("./tests/fixtures/wiki_retrieval.json"),
  ) as {
    positive: { query: string; expected: string[] }[];
    noAnswer: string[];
  };
  const connector = new LocalWikiConnector(WIKI, { logRequests: false });
  try {
    let recalled = 0;
    let reciprocalRank = 0;
    for (const test of fixture.positive) {
      const ids = (await connector.search(test.query, 3)).map((result) =>
        result.article.id
      );
      const rank = ids.findIndex((id) => test.expected.includes(id));
      if (rank >= 0) {
        recalled++;
        reciprocalRank += 1 / (rank + 1);
      }
    }
    const recallAt3 = recalled / fixture.positive.length;
    const mrr = reciprocalRank / fixture.positive.length;
    console.log(
      `wiki retrieval: Recall@3=${recallAt3.toFixed(3)}, MRR=${
        mrr.toFixed(3)
      }, ` +
        `no-answer cases=${fixture.noAnswer.length}`,
    );
    assert(
      recallAt3 >= 0.9,
      `Recall@3 ${recallAt3.toFixed(3)} is below 0.900; MRR=${mrr.toFixed(3)}`,
    );
    for (const query of fixture.noAnswer) {
      assertEquals(
        await connector.search(query, 3),
        [],
        `false-positive documentation for: ${query}`,
      );
    }
  } finally {
    connector.close();
  }
});
