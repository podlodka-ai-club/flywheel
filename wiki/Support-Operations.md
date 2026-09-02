<!-- meta
id: support-operations
type: process
audience: support
tags: [support, operations, zoho, ticket, status, pending, hold, routing, teams, partner, channels, chat, email, non-support, lifecycle]
-->

# Support Operations

**Read this when:** you are working the Zoho Desk queue and need to know what we own, what a status means, which team takes a request, how partner tickets work, or how to close non-support traffic.

---

## 1. What Support does and does not do

Acme Support (L1/L2) supports the Acme platform and diagnoses everything else to the boundary. Ownership is decided per component, not per ticket: one report can contain our bug, the hotel's network and a vendor's outage at once.

### We support the platform, and we diagnose to the boundary

Our scope is the software and servers we ship: the Acme TV app and the TV server, AcmeStream casting, the Guest App and Acme Staff, HotSign, the HSIA gateway and portal, the admin panel/CMS, the tablet app (BSP/RoomConnect) and the integration interfaces we run towards PMS, POS and task trackers. Access control is supported in Russia only. When a report touches something outside that scope we do not stop at "not ours": we run the checks only we can run — server reachability, CMS state, 1800 diagnostics, our logs, what the gateway sees — and hand over a specific finding. A mobile-key failure was traced through our logs to a room-number error and then to the key provider's SEOS cloud before the hotel was referred to the provider. A Wi-Fi authentication outage was worked down to the ISP firewall blocking OpenVPN. A TV server nobody could reach was diagnosed as a failed power supply and the partner was walked through recovery.
<!-- evidence: FW-005, FW-031, FW-087 -->

### What belongs to someone else

The hotel LAN — switches, access points, cabling, VLANs, the internet uplink — belongs to hotel IT or its network contractor; we control the MikroTik gateway only. TV channel streams belong to the channel provider or headend: the TV app only tunes to a multicast or HLS address, so stream quality, a missing channel or a partial outage is theirs or the hotel network's. PMS, POS, task-tracker and lock systems belong to their vendors: we process what they send and send what they accept. TV firmware is updated by the hotel with the files and instructions we provide. Browser and OS behaviour on staff computers, such as whether a notification sound plays, is the hotel's. Say who owns it, what we checked, and what they should tell the owner.
<!-- evidence: FW-180, FW-027, FW-229, FW-196, FW-153, FW-234, FW-237 -->

### Hand over with evidence, not with a guess

Before referring anyone to a third party, hold the evidence that shows the boundary: the log line that names the provider's error, the vendor's own confirmation of a table lock, a VLC test from a laptop in the TV VLAN that proves whether the stream is fine, a firewall finding after an AnyDesk session. "Contact your PMS vendor" without a finding comes back as a chaser and costs trust. If the boundary cannot be shown yet, say what we will check next and set the status to match.
<!-- evidence: FW-005, FW-153, FW-061, FW-031 -->

## 2. Channels

July–August 2026 brought 250 tickets (July 129, August 121): 196 by e-mail (78%), 48 from the web form (19%), 6 from chat (2%). Each channel has its own failure mode.

### E-mail

E-mail is the main channel. Most of it comes from partners, often forwarded from their own helpdesk, so the hotel's words arrive quoted inside the partner's. Reply through Zoho's Reply so the answer threads to the customer; a comment stays internal and the customer sees silence. E-mail also carries the noise — partner helpdesk acknowledgements, tracker notifications, out-of-office replies, spam and bounces arrive as new tickets and are closed as non-support traffic (section 8). Phone calls are not a channel: when a customer asks to be called or calls first, the request and the outcome are still written into the ticket.
<!-- evidence: FW-174, FW-082, FW-161 -->

### Web form

The web form produces short reports and sometimes an empty body — a title such as "wrong guest surname on the TV" with no description. Treat a web-form ticket as intake: confirm the property and ask for the one example that lets you look (room, guest, time) before doing anything else. Basic questions from properties also come this way. If the reporter has already fixed it by the time you ask, confirm and close.
<!-- evidence: FW-181, FW-144, FW-049 -->

### Chat and missed chats

Chat is rare and unreliable: visitors type "Hi" or "Support help" and leave, decline the call an agent starts, or the chat is not picked up in time and becomes a missed chat. A missed chat still creates a ticket. Rule: every missed chat gets an e-mail follow-up asking for the question and the property; if the contact address bounces or nobody answers, close it. A chat question that needs research is answered in the ticket, not in the chat window. Partners also use chat to chase status on an e-mail ticket — answer in the original ticket and add the person as CC.
<!-- evidence: FW-078, FW-080, FW-235, FW-123, FW-131 -->

### Partner service desks and trackers

Partners run their own helpdesks and task trackers, and the HSIA team runs its own service desk. Their automated e-mails land in our queue as tickets: "your request has been registered" acknowledgements, reminders that a partner ticket received a reply, tracker mentions and invitations, CC notices from a third-party vendor's desk and closure notices from the HSIA desk. None of these is a new request. Find the Acme ticket the notice refers to, make sure it is being worked, and close the notice.
<!-- evidence: FW-100, FW-110, FW-115, FW-101, FW-232, FW-122 -->

## 3. Ticket lifecycle and Zoho statuses

At export the corpus stood at Resolved 113, Pending 99, On Hold 17, Closed 15, Push RND/Product/etc 4, Open 2. Set the status with every reply; the status is how the queue is chased.

### Status meanings

Open — new, nobody has worked it. Pending — we are waiting for the customer or partner: answers, tests, a room to test in, confirmation. On Hold — we are waiting for an internal team (R&D, HSIA team, deployment, content managers) or a third party (PMS vendor, key provider, ISP). Push RND/Product/etc — handed to R&D or the product manager as a bug or feature request; no ETA is given. Resolved — a fix or answer was delivered and we await confirmation; it closes automatically if nobody replies. Closed — confirmed by the customer, or no action was needed. A ticket sitting in Open with three replies on it is invisible to whoever chases the queue.

### Pending versus On Hold

Pending means the next step is theirs: you asked which property, for 1800 photos and a video, for an order placed from a real room, or for confirmation that the fix works. On Hold means the next step is ours or a vendor's: R&D is reproducing, the HSIA team has a task, the key provider is investigating. The difference decides who gets chased: Pending is chased towards the customer; On Hold is chased internally, and the customer is told what we are waiting for and from whom. A ticket that sits On Hold for weeks without a dated plan is trigger E-009 in [Escalate or Answer](Escalate-or-Answer).
<!-- evidence: FW-021, FW-032, FW-135, FW-131, FW-047, FW-001 -->

### Push RND/Product/etc

Use it when the ticket has left Support: a reproduced bug with a development task, a payment-sync fault under investigation, a feature the product manager has queued. Tell the customer three things: it is confirmed and with the team; what they can do meanwhile (workaround, manual step); we will update the ticket when it is released — without a date. Dates given informally come back as chasers: "the fix should be released tomorrow", "next week". The ticket stays open until the release is deployed at that property and confirmed.
<!-- evidence: FW-036, FW-054, FW-088, FW-249, FW-048, FW-029 -->

### Resolved, Closed and re-opening

Resolved says "we believe it is fixed — please confirm"; it auto-closes if the customer never replies. Closed is for confirmed fixes and for tickets that need no action. Ask for confirmation before closing; when the customer closed the ticket themselves, one confirmation question is enough. The HSIA team's service desk resolves a request automatically after 2 days without a reply; it can be re-opened by commenting, and its notices arrive in our queue. A customer reply to a resolved ticket re-opens it — treat it as the same case with its history, not as a fresh report; a symptom that returns after every change is a pattern, not a new ticket.
<!-- evidence: FW-131, FW-184, FW-174, FW-117, FW-118, FW-188 -->

## 4. Categories and what each usually needs

Zoho categories in the corpus: tech-issues 136, uncategorized 56, basic-questions 37, content-update-request 9, feature-development-request 4, customization 2, choose-a-request-type 2, non-support 2, escalation 1, configuration 1. The category is set at creation and is often wrong (56 uncategorized; a price-calculation bug filed as a content request). Correct it when you triage.
<!-- evidence: FW-245 -->

### tech-issues

Something that worked does not. Needs the intake gates first — property, surface, scope, one concrete example, evidence — see [Ticket Intake Checklist](Ticket-Intake-Checklist). Typical first actions: check server and CMS state from our side, ask for 1800 photos and 1169 logs from one room, reproduce in the lab. Examples: the TV app not starting on any TV, minibar postings missing from the folio, the Staff app logging users out, a status not reaching HotSOS.
<!-- evidence: FW-032, FW-021, FW-085, FW-135 -->

### basic-questions and configuration

"How does it work", "can it do X", "please change a setting". Answered from the wiki and the product documentation; most need no engineer. Examples: payment-method choice on the TV, the in-house Wi-Fi expiry time, IPTV on a plain TV, lock support in another region, Bluetooth headphones. Configuration requests — a per-property setting such as bonus time or a service charge — are done by Support in the admin panel or HSIA portal and confirmed in the ticket.
<!-- evidence: FW-140, FW-142, FW-144, FW-219, FW-212 -->

### content-update-request and customization

Menus, welcome videos, promo videos, display groups and welcome-page layout go to the content managers with the asset and the exact place it belongs; Support does small edits itself. Check that the request really is content: a ticket filed as content turned out to be a price-calculation bug for R&D. Customization requests are answered with what the product does today — a greeting can only use what the PMS sends.
<!-- evidence: FW-239, FW-144, FW-245 -->

### feature-development-request, escalation and non-support

Feature requests go to the product manager with the use case; the answer is "passed to the product manager; no date". "Escalation" is the partner's word for a chaser with pressure — a reminder from the partner's system or a request for a plan and timelines; route it by trigger E-007 in [Escalate or Answer](Escalate-or-Answer). Non-support is for spam, provider offers and automated mail; close without a reply.
<!-- evidence: FW-241, FW-242, FW-249, FW-115, FW-089, FW-114, FW-116 -->

## 5. Teams and routing

Support keeps the ticket and the customer relationship; other teams get a task, a forward or a CC. The table is the summary; the entries below say what each team needs.

| Request type | Who | How |
|---|---|---|
| Reproducible bug, wrong calculation, integration fault on our side | R&D | Task with reproduction, versions, logs; status Push RND/Product/etc or On Hold |
| Feature request, product behaviour decision | Product manager | Forward with the use case; no date to the customer |
| MikroTik gateway config or replacement, DHCP/VLAN, portal backend, temporary open network | HSIA team | Task; ticket On Hold; HSIA desk notices may follow |
| Tariffs/plans, vouchers, bonus/expiry time, per-property Wi-Fi settings | Support (HSIA portal) | Do it, confirm in the ticket |
| Installation, server migration, PMS cut-over, TV app/firmware campaign | Deployment team | Task with an agreed maintenance window and on-site contact |
| Menus, videos, display groups, welcome-page content | Content managers | Task with assets and the target section |
| Installation-stage property, contract, hand-over, CRM stage | Project manager (PM) | Forward; reports go to the project chat/tracker |
| Licences, renewals, invoices, commercial-risk threads | Account manager (AM) | CC the AM; Support applies counts after approval |
| Sales or partnership contact | Business Development | Share the BD contact privately |
| Access control (Russia only) | Support access-control specialists | Stays in Support; weekday response |
| PMS/POS/lock vendor, channel provider, ISP, TV manufacturer | The hotel or partner contacts them | We attach the evidence (log line, test result) |

### R&D and the product manager

R&D takes reproduced bugs and code fixes: a night menu orderable outside its hours, a BSP "TV On" button broken in a new APK, false cleaning-cancellation requests, a status not reaching HotSOS, an add-on priced at zero on mobile. They need what the lab needs to reproduce: property, surface and version, room, time, steps, 1800 photos, 1169 logs, a video, an example order. The product manager takes feature requests and decides; Support forwards the use case and reports the decision, never a date.
<!-- evidence: FW-036, FW-054, FW-047, FW-135, FW-245 -->

### HSIA team and deployment team

The HSIA team takes gateway work: configuring a replacement MikroTik, watching the controller and gateway while on-site staff test at an access point, restoring authentication after a temporary open network. Support handles what the HSIA portal exposes: tariffs and plans, bonus/expiry time, vouchers. The deployment team takes work that needs a window: TV app and firmware campaigns, cloud updates coordinated with R&D, PMS cut-overs and migrations. Both get a task; the ticket goes On Hold and the customer is told what happens next.
<!-- evidence: FW-001, FW-027, FW-203, FW-180, FW-142, FW-198, FW-010 -->

### Content managers, PM, AM and Business Development

Content managers take content and layout work and advise on structure — a dedicated display group for one TV was rejected in favour of the standard app install after checking with them; welcome-page text and artwork were reworked. The project manager owns properties still in the installation stage, contracts and hand-over: a signed contract is forwarded to the PM, a report from an installation-stage property goes to the project chat/tracker, a change freeze is relayed to engineering and the PMs. The account manager owns licences and renewals; Support updates licence counts after the commercial step is confirmed. Requests for a sales or partnership contact go to Business Development.
<!-- evidence: FW-144, FW-239, FW-092, FW-198, FW-105, FW-204, FW-209 -->

## 6. Working with partners

### Partners open tickets on behalf of hotels

Most tickets come from partners — integrators, resellers, management companies — who manage several properties and relay what the hotel told them. Consequences: the partner may not know the history, the hotel's words arrive second-hand, and the partner is under pressure from the hotel. Always confirm which property before touching anything; read the subject and the CRM first so you do not ask what is already written. When two properties of the same partner are affected, say so and handle both.
<!-- evidence: FW-242, FW-053, FW-056, FW-021, FW-135, FW-157 -->

### Auto-acknowledgements and CC

Partner helpdesks acknowledge our replies automatically and send reminders when their ticket ages. Do not answer robots; keep the conversation in one Acme ticket. When a partner colleague asks for status on someone else's ticket, add them as CC rather than opening a parallel thread. Keep the AM in CC on commercial-risk threads and the PM on installation-stage properties. Never share one property's details in another property's ticket.
<!-- evidence: FW-100, FW-110, FW-115, FW-131 -->

### Joint calls and debug sessions

Complex cases are solved on a call with everyone who owns a piece: a joint test with the key provider's support at an agreed UTC time, a debug session with R&D, a technical call with the POS vendor, a joint call to unblock a VIP bandwidth request, a remote session requested by the integrator. Offer a window, name who attends from our side, make sure the request is accepted on time, and write the outcome into the ticket.
<!-- evidence: FW-005, FW-028, FW-153, FW-180, FW-206 -->

### On-site hands

Many diagnostics need hands on site, and the partner arranges them: a phone at the problem access point while the HSIA engineer watches the controller, a person to set up one test TV before a property-wide update, someone to collect TV logs on a USB stick, the hotel updating TV firmware from our files, a PC with AnyDesk next to an unreachable server. Ask for the on-site person at intake so the test does not wait a day.
<!-- evidence: FW-027, FW-047, FW-132, FW-234, FW-031 -->

### Partner escalations and freezes

Partners escalate in writing when the hotel is losing patience: months without a fix and a recommendation to owners at stake, a roll-out decision tomorrow, a request for a resolution plan and timelines. Handle by trigger E-007 in [Escalate or Answer](Escalate-or-Answer): AM in CC, an L2 owner, a written plan within one business day. A change freeze requested by a property is honoured and relayed to engineering and the PMs.
<!-- evidence: FW-025, FW-056, FW-089, FW-105 -->

## 7. Communication norms

### Reply, not comment; the customer's language; one question at a time

Answer with Reply so the customer receives it; a comment is internal. Answer in the language the customer wrote in — Russian or English; a ticket in any other language is answered in English. Ask the one clarifying question that unblocks you; if several are unavoidable, number them so the answers come back mapped. Never ask for "more information" — name the item: room number, 1800 photo, screenshot with the address bar.
<!-- evidence: FW-174, FW-008, FW-073 -->

### No credentials by e-mail; no dates for R&D

Never send logins or passwords by e-mail, and do not hand server credentials to a third party even when they say they had them before. Contacts and codes go to the named recipient privately. Do not promise release dates for R&D items: say the task is confirmed and queued and that we will update the ticket; a promised "tomorrow" becomes a chaser.
<!-- evidence: FW-031, FW-209, FW-249, FW-245, FW-048 -->

### Confirm before closing; apologise once; blame nobody without evidence

Ask for confirmation before you close. Apologise once for a delay and then give the next step; repeated apologies without a step read as no progress. Do not blame the PMS, POS or lock vendor without evidence: refer to a vendor with the log line or the vendor's own confirmation in hand. Check which ticket you are replying to — a message sent to the wrong customer has to be retracted and apologised for.
<!-- evidence: FW-131, FW-184, FW-245, FW-005, FW-153, FW-047 -->

### Acknowledge, then show progress

A fast acknowledgement is right, but "we are checking" is not progress. Every reply carries one of three things: a finding, a specific question, or what we are waiting for and from whom — with the matching status. When a case has bounced between teams for days, summarise it in one message before answering the latest point.
<!-- evidence: FW-009, FW-135, FW-180 -->

## 8. Non-support traffic

Roughly a fifth of the queue is not a request. Close it quickly and correctly so the queue shows real work: status Closed, category non-support, no reply unless the entry says otherwise.

### Auto-replies, out-of-office and recall notices

Out-of-office replies, "this person has left the company" replies and e-mail recall notices are closed without a reply. If the auto-reply names a new contact for an active case, add that contact to the original ticket. Do not merge the auto-reply into the case ticket.
<!-- evidence: FW-096, FW-129, FW-121, FW-106 -->

### Tracker notifications and helpdesk acknowledgements

Invitations to a partner's tracker, mentions of our group in a tracker comment, helpdesk registration confirmations, reminders on a partner ticket: find the Acme ticket they refer to, make sure it is being worked, close the notice. If the partner's tracker asks for something that is in no Acme ticket, ask for a ticket by e-mail or the web form.
<!-- evidence: FW-099, FW-101, FW-104, FW-100, FW-110, FW-115 -->

### Spam, one-time codes and encrypted-message links

Provider offers and spam are closed without a reply. One-time codes and verification e-mails addressed to the support mailbox are closed and never forwarded. A protected or encrypted-message notification is not readable by us: reply that we cannot open it and ask for plain text in the ticket; do not chase the link.
<!-- evidence: FW-114, FW-124, FW-081, FW-111, FW-116, FW-089 -->

### Bounces, contracts and contact changes

Delivery failures: check the address; if a real contact bounces on an active case, get another address through the partner. Signed contracts go to the project manager; licence paperwork goes to the account manager. A change of a contact's e-mail is updated in Zoho and the CRM and closed; a request for a sales contact is answered with the Business Development contact. Empty chats get one e-mail asking for the question, then close.
<!-- evidence: FW-078, FW-111, FW-180, FW-092, FW-204, FW-077, FW-209, FW-235 -->

## 9. Property lifecycle

### Installation stage: project chat and tracker

Until a property is handed over it is a project: the PM owns it, the deployment engineers work it, and reports go to the project chat or task tracker, not the support queue. If a support ticket arrives for an installation-stage property, say so and redirect; if the partner says the property has been handed over, ask the PM to update the CRM record and take the ticket. Contract documents arriving in the queue go to the PM.
<!-- evidence: FW-198, FW-092 -->

### Handed over: the support queue and the CRM record

After hand-over the property is supported through Zoho Desk. The CRM record is the reference for stage, licence counts and contacts; check it before asking the partner. Maintenance windows and freezes agreed with a property are relayed to engineering and the PMs. Commercial changes — more licences, renewals — go through the AM, and Support applies them after approval.
<!-- evidence: FW-204, FW-077, FW-105 -->
