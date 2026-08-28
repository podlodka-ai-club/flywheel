# Aperture Science internal wiki

Source of truth for the GitHub wiki pages describing how Aperture Science's Facility
Support Group operates. The fictional company is the vendor behind the support tickets
filed as issues in this repository.

Filenames follow GitHub wiki conventions — page title is derived from the filename, and
`_Sidebar.md` / `_Footer.md` are rendered on every page. Internal links are bare page
names rather than paths, so they resolve once published.

| File | Page |
|---|---|
| `Home.md` | Landing page, terminology, volume baseline |
| `Support-Tiers-Severity-and-Escalation.md` | Entitlement tiers, severity, SLAs, escalation ladder |
| `Facility-Down-Incident-Runbook.md` | P1 procedure, remote access, restart ladder |
| `Integration-Boundary-Handbook.md` | Third-party seams, ownership, authorisation failures |
| `Request-Intake-and-Triage-Standard.md` | Channels, categories, required information |
| `Content-Publishing-and-Change-Control.md` | Publishing pipeline, media specs, verification |

Worked examples cite repository issues by number, so the pages stay traceable to the
ticket corpus they were derived from.

## Publishing

`publish.sh` pushes every page to this repository's GitHub wiki. It requires the wiki to
have at least one page already — the wiki git repository does not exist until the first
page is created through the web UI — and write access to it.
