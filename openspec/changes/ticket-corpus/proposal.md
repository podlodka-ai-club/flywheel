## Why

The experiment stands or falls on the corpus: ~200 tickets mapped into the fictional B2B
domain, with gold labels, tenant/contact fixtures, and a declarative secret registry. Without
a validated corpus there is nothing for the agent to triage and no ground truth to score
against. The secret registry (`corpus/secrets.yaml`) is the core artifact that drives corpus
authoring, exam construction, and the demo.

## What Changes

- Import anonymized Zoho tickets and map them into the fictional analytics-platform domain.
- Author tenant and contact fixtures (tier, edition, topology, version, connectors) — state
  that lives in fixtures, not ticket text.
- Mark each ticket `teaching | exam | filler`; attach gold labels and correction scripts
  (what a human would have corrected, and at what delay `Δ`).
- Author `corpus/secrets.yaml` per the concept schema (S1–S5+): id, fact, correct,
  cold_expected, in_wiki, teaches[], exams[].
- Add a `corpus lint` CLI command validating each secret's four properties: not in ticket
  text, not in wiki (or deliberately stale), ≥2 teaching tickets, ≥1 exam ticket.
- Load corpus fixtures into PGLite via the seed loader.

## Capabilities

### New Capabilities
- `corpus-import`: Zoho ticket import, domain mapping, tenant/contact fixtures, and PGLite seed loading.
- `secret-registry`: `corpus/secrets.yaml` schema, parser, and the four-property lint command.

### Modified Capabilities
(none)

## Impact

- New: `corpus/{tickets/*.yaml,tenants.yaml,contacts.yaml,secrets.yaml}`,
  `server/src/services/corpus/*`, CLI command `corpus lint`.
- Populates `tickets`, `tenants`, `contacts`, `gold`, `secrets` tables.
- Flagship case E-107 (tenant on connector v2.3 that never files a teaching ticket) must be
  encoded so it is unanswerable without cross-tenant generalization.
- Depends on `data-model`.
