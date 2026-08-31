# Aperture Science internal wiki

Source of truth for the GitHub wiki pages describing how Aperture Science's Facility
Support Group operates. The fictional company is the vendor behind the support tickets
filed as issues in this repository.

Filenames follow GitHub wiki conventions — page title is derived from the filename, and
`_Sidebar.md` / `_Footer.md` are rendered on every page. Internal links are bare page
names rather than paths, so they resolve once published.

### How the company works

| File | Page |
|---|---|
| `Home.md` | Landing page, terminology, product index, volume baseline |
| `Support-Tiers-Severity-and-Escalation.md` | Entitlement tiers, severity, SLAs, escalation ladder |
| `Facility-Down-Incident-Runbook.md` | P1 procedure, remote access, restart ladder |
| `Integration-Boundary-Handbook.md` | Third-party seams, ownership, authorisation failures |
| `Request-Intake-and-Triage-Standard.md` | Channels, categories, required information |
| `Content-Publishing-and-Change-Control.md` | Publishing pipeline, media specs, verification |

### What the company sells

Products are ordered by share of support volume, derived from classifying the issues in
this repository by subject matter.

| File | Product | Share |
|---|---|---|
| `Chamber-Morale-Display.md` | In-chamber screen, devices, channels, mirroring | 39% |
| `Subject-Network-Access.md` | Connectivity, authentication, entitlement | 13% |
| `Requisition-Service.md` | Subject requests and their delivery to staff | 12% |
| `Facility-Console.md` | The operator's administration interface | 10% |
| `Aperture-Control.md` | Chamber apertures and credentials | 4% |

### Triage reference

Written for fast decisions rather than start-to-finish reading. Every entry is
self-contained and citable by identifier, so it survives being retrieved on its own.

| File | Page |
|---|---|
| `Escalate-or-Answer.md` | Escalate, ask, answer or close — with the hard triggers |
| `Confusable-Symptoms-Index.md` | Symptom pairs that read alike and diverge |
| `Unsupported-Requests-and-Alternatives.md` | What we do not do, and what to offer instead |
| `Minimum-Viable-Ticket.md` | What must be known before work can start |
| `Symptom-Vocabulary-RU-EN.md` | Reporter phrasing in both languages, mapped to our terms |

Identifier prefixes: `E-` escalation rules, `X-` confusable pairs, `U-` unsupported
requests, `Q-` intake gates, `T-` per-product triage rows.

Worked examples cite repository issues by number, so the pages stay traceable to the
ticket corpus they were derived from.

## Machine-readable export

The pages carry an HTML comment block of metadata — id, type, audience, tags — which is
invisible in the rendered wiki and parsed by `build_kb.py`.

```
python3 wiki/build_kb.py
```

This chunks the wiki into `kb_entries.json`, one entry per atomic unit — a triage row, an
escalation rule, a confusable pair — in the same shape as `fixtures/kb_articles.json`
(`id`, `title`, `tags`, `body`, plus `source` and `page`). Pages run well over a thousand
words each and retrieve badly whole, because one page matches every query; the entries
have a median body of around 300 characters and match one thing.

Regenerate it after editing any page. The existing `fixtures/kb_articles.json` is left
untouched.

## Publishing

`publish.sh` pushes every page to this repository's GitHub wiki. It requires the wiki to
have at least one page already — the wiki git repository does not exist until the first
page is created through the web UI — and write access to it.
