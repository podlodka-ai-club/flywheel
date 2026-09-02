# Acme Support Wiki — source of the `wiki/` pages

This folder is the source of truth for a synthetic **internal support wiki** for Acme Hotels Inc., the hospitality guest-technology vendor whose support tickets are filed as the 250 issues in this repository (FW-001 … FW-250, label `src/zoho-synth`). The real wiki cannot be exported, so these pages were **derived from the tickets**: every product behaviour, procedure and policy on them was read out of the ticket conversations and resolutions, and each entry records the tickets it was learned from in a hidden comment.

The pages were written from a shared authoring brief (canonical names, facts, identifier scheme, exclusion rules) by several writers, each working from a slice of the corpus, and then reviewed for cross-page consistency.

Purpose: give the support agent under evaluation a *baseline* documentation layer to ground its answers in (served through `search_knowledge_base`), and give scenario authors a stable reference of "what the wiki knows" so that memory tests can be written against what it does **not** know.

> **Synthetic content.** Company and product names are the ones used in the ticket corpus. Numbers such as severity targets are illustrative conventions, not the real vendor's SLAs — the list of such conventions is at the end of this file.

## Layout

Filenames follow GitHub wiki conventions (page title = filename with hyphens; links are bare page names; `_Sidebar.md` and `_Footer.md` render on every page).

### How we work

| File | Page |
|---|---|
| `Home.md` | Landing page, product map, index, standing terminology, volume snapshot |
| `Support-Operations.md` | Channels, Zoho statuses, categories, teams and routing, partner model, communication norms, non-support traffic |
| `Escalate-or-Answer.md` | The four outcomes, severity, hard escalation triggers `E-001…E-010`, routing per team |
| `Ticket-Intake-Checklist.md` | Intake gates `Q-001…Q-008`, standard diagnostic asks per surface |
| `Remote-Access-and-Connectivity.md` | VPN, AnyDesk, whitelisting, what we can and cannot reach, "server unreachable" diagnostics |
| `Updates-Maintenance-and-Change-Control.md` | App/firmware/server/stream updates, the test-folder method, windows, freezes, backups |

### Products

| File | Product |
|---|---|
| `Acme-TV.md` | The interactive TV application: devices, service codes, registration and licences, welcome page, check-in/out behaviour, content, apps |
| `TV-Channels-and-Video-Streaming.md` | Multicast/HLS channels, VLC test, channel lists, encoders, streamer / streameradmin, welcome and promo videos |
| `Casting-Chromecast-and-AirPlay.md` | AcmeStream: Chromecast, Apple TV, session controllers, encoders, cast licences |
| `Guest-Wi-Fi-HSIA.md` | MikroTik gateways, HSIA portal, login methods, tariffs, DHCP, captive portal |
| `PMS-Integration.md` | Opera (FIAS/OHIP), Opera Cloud, Protel Air, Shiji, 1C: data flows, regional domains, failure modes |
| `Guest-App.md` | Web app and native app: QR login, regions, content device types, messages, payments, performance |
| `In-Room-Ordering-and-Staff-App.md` | Shop Orders and Service Requests, statuses, notifications, working hours, POS and task-tracker integrations, Acme Staff |
| `In-Room-Tablets-and-Room-Control.md` | BSP / RoomConnect tablets, check-in popup, TV control, MAS, RCU / GRMS |
| `Admin-Panel-and-CMS.md` | Old and new admin panel, regions, login/SSO/reset, users and roles, publishing, media specs, templates, reports |
| `HotSign-Digital-Signage.md` | Signage CMS, Raspberry Pi players, builds, troubleshooting |
| `Door-Locks-and-Mobile-Keys.md` | OS Access, Upkey, SmartPass, cards and encoders, mobile key boundary |

### Reference

| File | Page |
|---|---|
| `Confusable-Symptoms.md` | `X-` pairs: symptoms that read alike and diverge, with the one check that separates them |
| `Unsupported-Requests-and-Alternatives.md` | `U-` entries: what we do not do, and what to offer instead |
| `Known-Issues-and-Release-Notes.md` | `K-` entries: version-specific bugs, recent incidents, hardware end-of-life, as of August 2026 |
| `Licensing-and-Commercial-Requests.md` | Licence types and counts, purchase path, contracts and contacts |
| `Glossary-and-Phrasebook.md` | Products, abbreviations, support vocabulary, Russian/English symptom phrasebook |

Identifier prefixes: `E-` escalation triggers, `Q-` intake gates, `X-` confusable pairs, `U-` unsupported requests, `K-` known issues, `T-<AREA>-nn` per-product triage rows (`TV`, `CH`, `CAST`, `WIFI`, `NET`, `PMS`, `APP`, `ORD`, `TAB`, `ADM`, `SIGN`, `LOCK`). Entries are self-contained so that a retrieved fragment carries its own context. `E-004` (guest notes reaching staff incomplete) and `Q-003` (scope) are referenced by `evals/scenarios/pos-notes-truncation.yaml` and must keep their meaning.

## Page format

Each page opens with an HTML comment carrying machine-readable metadata (`id`, `type`, `audience`, `tags`), then the H1, a one-line **Read this when**, numbered `##` sections and `###` entries. The tickets an entry was learned from follow it as a hidden comment, `<!-- evidence: FW-021, FW-064 -->`, which GitHub does not render; `hide_evidence.py` produces those comments from visible `[FW-021](https://github.com/podlodka-ai-club/flywheel/issues/21)` citations, so a citation added in link form can be hidden by running it again. Russian appears only in **Also asked as** lines and in the phrasebook — the knowledge-base search only indexes English tokens.

## Machine-readable export

```
python3 wiki/build_kb.py            # writes wiki/kb_entries.json
python3 wiki/build_kb.py --check    # also validates wiki links and identifier uniqueness
```

`build_kb.py` chunks every page into one entry per `###` block (or per `##` section without sub-entries) in the same shape as `fixtures/kb_articles.json` — `id`, `title`, `tags`, `body`, plus `source`, `page` and `evidence` (the ticket numbers from the hidden comments; the comments themselves are stripped from `body`, so the agent never sees ticket numbers). Whole pages retrieve badly through the mock connector's term-frequency search (one page matches every query); the entries are a few hundred characters each and match one thing. The scenario runner's `knowledge_base: wiki` setting is meant to serve `wiki/kb_entries.json` through the KB connector. Regenerate after editing any page. `fixtures/kb_articles.json` (the DataBridge fixture world) is untouched.

`coverage.md` (regenerate with `python3 wiki/build_kb.py --coverage`) lists, for every ticket, which pages reference it; all 250 tickets are referenced by at least one page. The current export holds 576 entries from 22 pages (median body about 721 characters).

## What the wiki deliberately does not contain

The wiki is the baseline the agent can look up; memory engines are evaluated on what is *not* here. The pages therefore exclude:

1. **Property-specific facts** — per-hotel settings, domains, IP addresses, licence counts, contacts, maintenance dates, room numbers. Hotels appear only inside evidence citations, never as the subject of a statement.
2. **One-off resolutions** — the concrete fix applied to one customer (a changed queue domain, a cache TTL set for one property, a webhook created for one hotel). The general mechanism is documented; the customer's instance is not.
3. **The FW-248 fix** — the POS order payload (which field carries the room number, header information lines, condiments and their limits). Only the rule E-004 is documented, so that `pos-notes-truncation.yaml` keeps testing memory rather than lookup.
4. **Ongoing-incident narratives** outside `Known-Issues-and-Release-Notes.md`, where they are dated "as of August 2026".
5. **People** by name, credentials, real URLs, IP ranges.

Citation is not documentation: a page cites a ticket for the general behaviour and drops the customer-specific resolution. Scenario authors looking for *undocumented* product knowledge should compare a ticket's resolution footer with what the citing pages (see `coverage.md`) actually say.

## Illustrative conventions (not grounded in a ticket)

Every product fact on the pages traces to a ticket through the hidden evidence comments. The items below are working conventions the authors added so that the pages read as complete operational documentation; treat them as illustrative, not as facts learned from the corpus.

**Process pages (Support Operations, Escalate or Answer, Ticket Intake Checklist, Unsupported Requests)**
- Severity targets — P1 acknowledged within 1 hour with updates every 2 hours, P2 same business day, P3 two business days, P4 best effort — and the 30-day threshold behind E-009.
- Phone calls are not a channel; the outcome is written into the ticket. Tickets in languages other than Russian or English are answered in English.
- One clarifying question at a time, numbered when several are unavoidable; apologise once; one reminder before a Pending ticket lapses; summarise a bounced case in one message.
- Non-support traffic is closed as Closed with the category non-support (the corpus mostly used Resolved and uncategorized).
- The long-thread threshold (second recurrence of the same fault, or the third "any update?").
- E-003: the hotel handles guest refunds. E-005: the hotel posts missing charges manually meanwhile. E-006: check from our side "within minutes". E-010: the review steps (audit admin users, reset passwords, remove unknown users).
- The well-formed-ticket template; the incognito or second-phone test for Guest App reports.
- U-001: record who approved an open-network exception and when it ends. U-002: test a VIP room before arrival. U-019: do not start remote lock diagnostics for properties outside Russia.

**Acme TV, TV Channels, Casting**
- Virtual Standby "cannot be applied fleet-wide on at least some models" generalises one ticket in which the model is unnamed.
- Casting rule of thumb: first occurrence of "All devices busy" → restart, second → propose the upgrade; "service unavailable" answered within the hour.
- Inferred causes where the ticket never concluded: a first-start hang on a set the hotel installed itself (T-TV-14), image format or colour profile (T-TV-17), guest Wi-Fi as a cause of a single-room casting failure (T-CAST-05).
- Loewe sets are "handled like any other hotel TV".

**Guest App, In-Room Ordering, Tablets**
- The automatic opening of the app after Wi-Fi login is described as a captive-portal matter.
- QR-code advice: re-scan with the phone camera; regenerate codes from the full address including the scheme.
- "Explain the checkbox logic in writing first" and "test one stay afterwards" for payment settings.
- Room Control examples (lights, curtains, climate); the deployment team named as owner of the Pi update script.
- The Completed button being hidden by the old panel or user rights; E-003 cases handed to R&D "the same day"; unsupported report columns routed to the product manager.

**Admin Panel, HotSign, Door Locks, Licensing**
- Check for a platform-wide cloud incident before troubleshooting a browser; "corridor monitor" prompts the HotSign-player-or-TV question.
- Reports are self-service; support does not compile them by hand.
- Changed check-in templates trigger an access audit; a repeat is treated as an incident. A templates-section error at every property is routed as E-008.
- HotSign: use a LAN cable during setup; never promise the old interface back.
- Locks: cards that cannot be written during arrivals are P1, configuration questions P4; no factory-reset procedure is on file; registration codes go only to the property's contact.
- Licensing: HotSign player counts are a question for the account manager; never quote counts from memory; the N/M wording template.

**Guest Wi-Fi, Remote Access, PMS Integration**
- The `T-NET` identifier family for connectivity rows (the brief listed no connectivity area).
- "Open any web page to trigger the captive portal" on iOS; guests may switch off the private (randomised) MAC address; MAC randomisation draining DHCP pools (raised as a question in one ticket, not confirmed).
- The bonus-time remark about clock time versus hours; router replacement taking "days rather than hours"; the SMS-provider checklist (balance, originator, credentials); a wired speed test behind the gateway; the evening pattern for pool exhaustion.
- A bandwidth request bouncing between teams treated as commercial-risk (E-007).
- Guest-Wi-Fi reachability of the WebApp and the encoder web page as server prerequisites and session prep items; "recurrence goes to Known Issues / E-008".
- Opera Cloud "on-site interface host" inferred from one ticket; "check our documentation before asking the partner which PMS they run".
- Wrong regional API domain as silent data loss (generalised from one callback-domain case); "unblock the standard queue endpoint rather than move a property to a special configuration" (the customer's argument in FW-021, adopted as policy).
- A TV registered to the wrong room as a wrong-surname cause; "calling address changed after a region transfer" as a NotWhitelisted cause.

**Updates, Confusable Symptoms, Known Issues, Glossary**
- Rollback wording: "keep the previous build at hand" for whole-hotel updates, "the test TV goes back to the main address"; "note a freeze in every related ticket"; "do not bundle unrelated changes into one window"; a post-release spot-check of an order from the TV and the phone.
- K-001 "verify the APK version before assuming it is fixed"; K-005 "check totals in the admin panel before posting them"; K-006 "a list of the partner's affected properties on request".
- Glossary additions without a ticket: GM, SLA, "Acme cloud" as a named component, "rotation" for the casting device pool.

## Publishing

`publish.sh` pushes every page (except this README, `coverage.md`, the scripts and the export) to this repository's GitHub wiki. It requires the wiki to have at least one page already — the wiki git repository does not exist until the first page is created through the web UI — and write access to it. It is not run automatically.
