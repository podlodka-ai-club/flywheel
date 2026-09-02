<!-- meta
id: home
type: index
audience: support
tags: [index, overview, products, acme, support, escalation, terminology, hotel, guest, partner]
-->

# Acme Support Wiki

Internal documentation for **Acme Support** — the team that keeps the guest-technology platform running at the hotels our partners operate: the interactive TV, casting, guest Wi-Fi, the guest app and in-room ordering, in-room tablets, digital signage, door locks, and the integrations that tie them to the hotel's PMS, POS and task systems.

This wiki is the reference for *how the products behave* and *how we work a ticket*. It is written so that any single section can be read on its own: every triage row, escalation trigger and glossary entry carries its own context.

---

## 1. How to use this wiki on a ticket

1. **Establish the basics** — which property, which surface (TV, WebApp, native app, tablet, Staff app, admin panel, HSIA portal, HotSign), one room or the whole property. The [Ticket Intake Checklist](Ticket-Intake-Checklist) lists the gates (Q-001…Q-008); most stalled tickets are missing one of them.
2. **Check the hard triggers** in [Escalate or Answer](Escalate-or-Answer). A guest who cannot enter a room, a whole property dark, an allergy note cut short, charges not reaching the folio — these escalate before any diagnosis.
3. **Find the symptom** on the product page (triage rows T-…), or in [Confusable Symptoms](Confusable-Symptoms) when two causes look alike. Each row says what to check first, who owns it, and what to tell the customer.
4. **Check version-specific behaviour** in [Known Issues and Release Notes](Known-Issues-and-Release-Notes) before promising a fix, and [Unsupported Requests](Unsupported-Requests-and-Alternatives) before saying yes to a request.
5. **Answer in the customer's words.** Reporters write in Russian and English; the [Glossary and Phrasebook](Glossary-and-Phrasebook) maps their phrasing to our terms.

---

## 2. What we support

| Page | Product | What it covers |
|---|---|---|
| [Acme TV](Acme-TV) | The interactive TV application on hotel TVs and set-top boxes | Devices, service codes, registration and licences, welcome page, check-in/out behaviour, content on the TV, apps |
| [TV Channels and Video Streaming](TV-Channels-and-Video-Streaming) | Live channels and video served through the TV server | Multicast and HLS, the VLC test, channel lists, encoders, streamer and streameradmin, welcome and promo videos |
| [Casting: Chromecast and AirPlay](Casting-Chromecast-and-AirPlay) | AcmeStream | Chromecast and Apple TV casting, session controllers, "All devices busy", encoders, cast licences |
| [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) | Acme HSIA | MikroTik gateways, the HSIA portal, login methods, vouchers, tariffs and speed, DHCP, the captive portal |
| [PMS Integration](PMS-Integration) | Opera (FIAS/OHIP), Opera Cloud, Protel Air, Shiji, 1C | Check-in/out, guest names, room status, postings, regional API domains, failure modes |
| [Guest App](Guest-App) | Acme Guest App — web app and native mobile app | QR login, regions, content device types, guest messages, payments and bill, performance |
| [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) | Shop Orders, Service Requests, Acme Staff | Statuses, notifications, working hours, payments, POS and task-tracker integrations, reports |
| [In-Room Tablets and Room Control](In-Room-Tablets-and-Room-Control) | BSP / RoomConnect tablets, MAS, RCU / GRMS | Check-in popup, TV control from the tablet, room automation |
| [Admin Panel and CMS](Admin-Panel-and-CMS) | Old admin panel and the new admin panel (admin v2) | Regions, login and SSO, users and roles, publishing rules, media specs, templates, reports |
| [HotSign Digital Signage](HotSign-Digital-Signage) | Acme HotSign | Signage CMS, playlists, Raspberry Pi players, builds, troubleshooting |
| [Door Locks and Mobile Keys](Door-Locks-and-Mobile-Keys) | OS Access, Upkey, SmartPass, mobile key (SEOS) | Cards and encoders, areas, emergencies, provider boundaries, support geography |

### What we do not own

We diagnose to the boundary and hand over with evidence. The hotel or its contractor owns the access points, switches, cabling and the internet uplink; the hotel owns the TVs and their firmware, power and network segments; the PMS, POS, task-tracker and lock/key vendors own their systems; the channel provider owns the streams. The [Support Operations](Support-Operations) page describes the boundary and the [Remote Access and Connectivity](Remote-Access-and-Connectivity) page describes what we can actually reach.

---

## 3. How we work

| Page | Read this when |
|---|---|
| [Support Operations](Support-Operations) | You need the channels, the Zoho statuses, the teams and who takes what, the partner model, or how to close non-support traffic |
| [Escalate or Answer](Escalate-or-Answer) | You are deciding whether a ticket is escalated, answered, questioned or closed — with the hard triggers E-001…E-010 and severity |
| [Ticket Intake Checklist](Ticket-Intake-Checklist) | A ticket arrived and something is missing — property, surface, scope, example, evidence |
| [Remote Access and Connectivity](Remote-Access-and-Connectivity) | You cannot reach a server, a gateway or a PMS host, or a partner needs access |
| [Updates, Maintenance and Change Control](Updates-Maintenance-and-Change-Control) | A fix needs a TV app, firmware, server or stream-service update, or a hotel asks for a change freeze |

## 4. Reference

| Page | Answers |
|---|---|
| [Confusable Symptoms](Confusable-Symptoms) | Two faults look identical — which one is this? (X-…) |
| [Unsupported Requests and Alternatives](Unsupported-Requests-and-Alternatives) | Things we do not do, and what to offer instead (U-…) |
| [Known Issues and Release Notes](Known-Issues-and-Release-Notes) | Version-specific bugs, recent incidents, hardware end-of-life notes (K-…), as of August 2026 |
| [Licensing and Commercial Requests](Licensing-and-Commercial-Requests) | TV and Cast licences, how counts behave, buying more, contracts and contacts |
| [Glossary and Phrasebook](Glossary-and-Phrasebook) | Products, abbreviations, support vocabulary, Russian/English symptom phrasing |

**Identifier prefixes.** `E-` escalation triggers · `Q-` intake gates · `X-` confusable pairs · `U-` unsupported requests · `K-` known issues · `T-TV`, `T-CH`, `T-CAST`, `T-WIFI`, `T-NET`, `T-PMS`, `T-APP`, `T-ORD`, `T-TAB`, `T-ADM`, `T-SIGN`, `T-LOCK` per-product triage rows.

---

## 5. Standing terminology

| Term | Meaning |
|---|---|
| Property / hotel | One site. Partners run several; always confirm which one a ticket is about. |
| Partner | The integrator, reseller or management company that opens most of our tickets on behalf of hotels, often forwarding the hotel's own words. |
| Surface | Where the symptom shows: TV app, WebApp, native app, tablet (BSP), Staff app, old or new admin panel, HSIA portal, HotSign CMS. |
| TV server | The on-prem Ubuntu server (or cloud deployment) behind Acme TV — web front end, PMS interface, streamer, VPN client. |
| Service codes | Remote-control codes typed from the TV main menu: 1800 diagnostic page (Network, Device, Authorization), 1169 logs, 1105 registration reset, 100 content refresh. |
| Publish | Content and configuration changes reach devices only after Publish; allow up to 20 minutes or force with code 100 / a power cycle. |
| Region | Our cloud runs in EU, NA and RU regions; admin panels, API domains and app servers are regional and an account lives in one of them. |
| Licence | TV licences and Cast licences are separate counts; tablets are counted separately from TVs. |

The full list is in the [Glossary and Phrasebook](Glossary-and-Phrasebook).

---

## 6. The ticket landscape

Support handled **250 tickets** in July and August 2026 (129 and 121). Email brings 78% of them, the web form 19%, chat 2%. Roughly half are technical issues, a fifth are administrative or automated messages that only need closing, and the rest are how-to questions, content updates and feature requests. Most tickets arrive from partners, which is why "which property?" is the first question on this wiki.

---

## 7. In one line

If a guest cannot enter a room, an entire property is dark, an allergy note reaches the kitchen cut short, or charges are not reaching the folio — escalate first and diagnose second. Everything else can wait for the intake checklist.
