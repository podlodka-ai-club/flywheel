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

Worked examples cite repository issues by number, so the pages stay traceable to the
ticket corpus they were derived from.

## Publishing

`publish.sh` pushes every page to this repository's GitHub wiki. It requires the wiki to
have at least one page already — the wiki git repository does not exist until the first
page is created through the web UI — and write access to it.
