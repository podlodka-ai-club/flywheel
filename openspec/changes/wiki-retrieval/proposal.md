## Why

The `wiki-rag` arm is the baseline memory has to beat, and the argument only holds if that
baseline is competent. This change provides good keyword-plus-embedding retrieval over the
wiki markdown so the comparison is fair — a strawman RAG would make the headline result
meaningless.

## What Changes

- Chunk and index the `wiki/*.md` corpus (headings-aware chunking).
- Compute embeddings for chunks and provide keyword + embedding (hybrid) retrieval.
- Expose a `retrieve(query, budget) → chunks` interface the context assembler uses as the
  wiki layer.
- Mark retrieved wiki chunks as a citation layer (`layer = wiki`) so retrieved-vs-cited is
  measurable for the RAG arm too.
- Keep it deterministic/testable (cache embeddings; fake embedder in tests).

## Capabilities

### New Capabilities
- `wiki-retrieval`: Hybrid keyword + embedding retrieval over the wiki markdown, exposed as the agent's optional wiki context layer.

### Modified Capabilities
(none)

## Impact

- New: `server/src/services/retrieval/{chunk.ts,embed.ts,retrieve.ts,index.ts}`.
- Consumed by `triage-agent` (wiki layer) and enabled/disabled per arm by `arm-runner`.
- Feeds `citations` with `layer = wiki` rows.
- Depends on `wiki-corpus` (content) and `triage-agent` (assembler interface).
