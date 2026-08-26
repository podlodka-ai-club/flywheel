## Why

The wiki is the control condition — the RAG arm's knowledge source and the baseline that
memory must beat. It must be a *competent* corpus, not a strawman: the thesis only holds if
memory outperforms good retrieval. Critically, one page is deliberately **stale** (Billing
ownership still attributed to the old team), which is what lets the demo show memory
overriding a document.

## What Changes

- Author 8–15 markdown pages: architecture overview, team ownership, connector docs,
  deployment topologies (cloud / on-prem / air-gapped), severity policy.
- Make the corpus deliberately incomplete so a measurable slice of decisions is unanswerable
  from it.
- Include exactly one **stale** page: it asserts the *old* owner of the Billing module,
  contradicting the learned fact (S2).
- Ensure the wiki does NOT contain the other secrets' facts (validated by `corpus lint`'s
  "not in wiki" check).

## Capabilities

### New Capabilities
- `wiki-content`: The authored `wiki/*.md` RAG corpus — competent, deliberately incomplete, with one intentionally stale ownership page.

### Modified Capabilities
(none)

## Impact

- New: `wiki/*.md` (architecture, ownership, connectors, topologies, severity, etc.).
- Consumed by `wiki-retrieval` (RAG) and referenced by `secret-registry` lint (`in_wiki:
  false | stale`).
- The stale page is load-bearing for success criterion 5 (wiki-rag wrong, warm right).
- Depends on `ticket-corpus` (secret registry defines what must/must not appear in the wiki).
