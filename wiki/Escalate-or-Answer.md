<!-- meta
id: escalate-or-answer
type: decision
audience: support
tags: [escalation, escalate, severity, priority, outage, trigger, routing, answer, close, decision, rnd, hsia, partner, guest, security]
-->

# Escalate or Answer

**Read this when:** a ticket is in front of you and you must decide whether to escalate it, ask for more, answer it from the wiki, or close it.

---

## 1. The decision

Every ticket ends in one of four outcomes.

- **Escalate** — hand it to the team that owns the fix with everything they need, and tell the customer who has it and what happens next.
- **Ask** — an intake gate is missing and you cannot look without it; ask one crisp question and set Pending.
- **Answer** — the behaviour is documented or by design, or the fix is in your hands (a setting, a republish, a licence clean-up, a service restart).
- **Close** — there is no request, or the customer already solved it.

Procedure, in this order:

1. Identify the surface (TV, WebApp, native app, tablet, Staff app, old or new admin panel, HSIA portal, HotSign) and the property.
2. Decide ownership — ours, the hotel's network, a vendor's — and diagnose to that boundary either way.
3. Check the hard triggers E-001…E-010 (section 3). Any hit: escalate now and ask for missing details in parallel. Intake never delays a P1.
4. Check the intake gates Q-001…Q-008 in [Ticket Intake Checklist](Ticket-Intake-Checklist). A gate that blocks the next step: ask.
5. Otherwise answer from the documentation (section 6) or close (section 7).

## 2. Severity

Severity comes from impact — rooms affected, function lost, a guest blocked, money or data involved — never from the reporter's adjectives. The targets are internal and illustrative.

### P1 — whole-property outage, safety, guest locked out

P1 is all TVs, all guest Wi-Fi, the PMS interface for the whole property, a guest who cannot get into their room, or a safety issue. Acknowledge within 1 hour in support hours, work continuously, update at least every 2 hours until service is back. Examples: the TV app not starting on any TV at the site, every TV without a menu because the server's power supply failed, HSIA down for vouchers and PMS login alike, guest cards that do not open the door or the elevator.
<!-- evidence: FW-032, FW-087, FW-206, FW-055 -->

### P2 — many rooms or one function down

P2 is a function down for the property, or many rooms affected while the rest works. Target: same business day. Examples: minibar postings not reaching the folio, e-mail templates gone for every property that uses them, channels dropping back to the welcome screen in several rooms, Chromecast unusable for months, BSP control lost on all TVs.
<!-- evidence: FW-021, FW-029, FW-234, FW-025, FW-188 -->

### P3 — single room or cosmetic

P3 is one room, one device, one guest, or a cosmetic defect. Target: 2 business days. Examples: a wrong surname on one TV, one HotSign panel not taking Push Updates, one Chromecast with sound but no picture, one notification that arrived without a sound.
<!-- evidence: FW-181, FW-149, FW-052, FW-237 -->

### P4 — questions and feature requests

P4 is how-to questions, configuration wishes and feature requests. Best effort, no dates. Examples: payment-method choice on the TV, task priority towards Flexkeeping, more detail in the guest's request history, a personalised welcome greeting.
<!-- evidence: FW-140, FW-242, FW-249, FW-239 -->

### Reporter wording does not set severity

Partners write "urgent" and "critical" on P3 tickets and write calmly about P1s. "Please fix asap" for one tablet button is a bug report; a polite "the TV interface does not show all check-ins" was a down server. Set severity from impact: how many rooms, which function, is a guest blocked, is money or data involved. Raise it when the facts change — a report that grows from one room to the whole site is re-triaged. Do not lower it because the reporter is calm.
<!-- evidence: FW-054, FW-009, FW-032 -->

## 3. Hard escalation triggers

A trigger is a fact in the ticket that decides the outcome by itself. If any of these is present, escalate first and gather the rest in parallel.

### E-001 — A guest cannot enter their room
**Trigger.** A guest's mobile key or card does not open the door (or the elevator reader on the way), whatever the reason. P1.
**Action.** Confirm the room and whether it is one guest, one room or all cards. Get the guest in first: reception re-issues a card; where the access-control mobile app runs, a card can be written at the lock itself (emergency writing). Then find the cause. Mobile-key errors originate in the key provider's SEOS cloud — our logs show the room-number error and the hotel is referred to the provider with that finding. Card failures at a lock or reader: read the audit with Upkey and check that the lock and elevator-reader clocks are in sync. A vendor server outage: hosts-file/VPN workaround until the vendor recovers. Access control is supported by us in Russia only; elsewhere the lock vendor owns it.
**Holds until.** The guest has a working key and the cause is named in the ticket.
<!-- evidence: FW-005, FW-055, FW-194 -->

### E-002 — Guest data survives check-out
**Trigger.** A signed-in account (YouTube, apps) is still there for the next guest, or the previous guest's name is shown after a new check-in. Data-protection path, whatever the size.
**Action.** First establish whether a check-out ever reached us: without a PMS check-out no reset command is ever sent. Check the Guest list for stale check-ins, run the check-out (in bulk if needed) and enable the per-property option that auto-checks-out guests N hours after the planned departure. If check-outs are arriving and accounts still persist, it is a TV-side defect: ask for a video of check-in → sign in → check-out → reboot with the credentials still present, the TV models, and TV logs, then escalate to R&D. If the previous guest's name reappears after a new check-in, check the check-out/WOL path and the property configuration and escalate to R&D with the example.
**Holds until.** A real check-out on a test room clears the account and the greeting, confirmed by the hotel.
<!-- evidence: FW-132, FW-157, FW-013 -->

### E-003 — A payment without an order, or an order lost after payment
**Trigger.** Money moved but the platform shows no matching order; an order is Cancelled although its payment succeeded; an order changed status or vanished without the hotel acting. Financial integrity.
**Action.** Collect the order number(s), the payment references or screenshots from the payment module, timestamps, the surface that placed the order and who processed it. Escalate to R&D with the reconciliation question stated plainly ("payment X has no order; order Y is Cancelled but paid"). Ask the hotel to serve or refund the guest by its own process — we do not talk to guests about refunds. When an integration outage broke a status hand-off, check the whole outage window for other affected orders, not only the reported one.
**Holds until.** Every payment in the period has a matching order and status, and the cause is fixed or monitored.
<!-- evidence: FW-088, FW-065 -->

### E-004 — Guest-supplied notes reach staff incomplete
**Trigger.** Text the guest typed into an order or request — allergy, dietary, delivery instructions — reaches the kitchen or housekeeping truncated or missing on receipts or tasks. Safety, regardless of which side truncates.
**Action.** Treat it as a safety defect, not a feature request. Tell the hotel to read guest notes in full in the admin panel or Acme Staff before preparing anything, until the fix is confirmed. Escalate to R&D and the integration colleagues with one example order and the receipt or task exactly as staff saw it. Involve the POS or task-tracker vendor through the partner if their side is involved — but our escalation does not wait for them.
**Holds until.** A test order with a long note reaches the staff surface complete, end to end.
<!-- evidence: FW-248 -->

### E-005 — Charges not posting to the folio
**Trigger.** Minibar items, orders or other postings from the TV or app do not appear on the guest folio in the PMS, or payment status disagrees between the platform and the PMS. Financial.
**Action.** Get examples (room, time, items) and the PMS type. Check the known rejection reasons first: the PMS flag Posting deny, postings sent after check-out (OHIP rejects them), new article codes not yet in the integration cache, an interface that is not running (restart it, request a database resync). Escalate to R&D with the examples. Ask the hotel to check the whole period since the first failure, not only the noticed cases, and to post the missing charges manually meanwhile.
**Holds until.** Test postings from a room reach the folio and the period is reconciled by the hotel.
<!-- evidence: FW-021, FW-064 -->

### E-006 — Whole-property outage
**Trigger.** All TVs, all guest Wi-Fi, or the PMS interface for the property down. P1.
**Action.** Check from our side within minutes: is the TV server or gateway reachable over VPN, does the CMS show TVs online, are check-ins arriving. Server unreachable: the hotel checks power, network and internet on the server, then provides AnyDesk on a PC in the same network if it looks up; a server that will not boot gets the recovery instructions. Server fine but TVs black: a network segment — ask which IP a TV receives and for 1800 photos from one room. HSIA down: HSIA team task in parallel with voucher and PMS-login checks. Update the customer at least every 2 hours until recovery and name the cause afterwards.
**Holds until.** Service is restored and confirmed in the rooms.
<!-- evidence: FW-032, FW-087, FW-082, FW-206 -->

### E-007 — Commercial-risk language
**Trigger.** Words that put the account at risk: renewal, recommendation to owners, an executive visit, a remediation plan requested, senior management or HQ copied, a VIP arrival hanging on us, "the hotel decides tomorrow".
**Action.** Within one business day: the account manager in CC, an L2 owner named on the ticket, and a written plan with dated steps (what we do, what the hotel does, when we report next). Offer a call. Stop answering only the latest message — summarise the case. Do not promise what R&D has not committed to.
**Holds until.** The partner has acknowledged the plan and the AM is tracking it.
<!-- evidence: FW-025, FW-029, FW-056, FW-180 -->

### E-008 — Same defect at more than one property, or right after a release
**Trigger.** A partner sees the same symptom at two or more properties, or the symptom started right after an app, APK or CMS release.
**Action.** Escalate to R&D as a product bug (Push RND/Product/etc), not as a per-property ticket: versions involved, the list of affected properties, reproduction steps, one complete set of evidence. Record it in [Known Issues and Release Notes](Known-Issues-and-Release-Notes). Tell the partner it is treated as a product issue and what the workaround is. Do not name one property to another.
**Holds until.** The fix is released and confirmed at each affected property.
<!-- evidence: FW-010, FW-054, FW-085, FW-029 -->

### E-009 — A fault older than 30 days without a dated plan
**Trigger.** The ticket has been open more than 30 days and the last message to the customer contains no dated next step — only "passed to the team" or "any update?".
**Action.** Review with the PM and AM: what is blocked, whether a workaround or partial fix exists, whether an on-site visit or a call is needed. Write the customer a summary with a dated plan, or an honest statement of what is unknown and when we will next report. Re-check severity — long-open tickets tend to be under-triaged.
**Holds until.** A dated plan exists and is met, or the ticket is re-escalated.
<!-- evidence: FW-025, FW-245, FW-030 -->

### E-010 — Security signals
**Trigger.** Requests to share credentials (server logins, other users' passwords), requests to disable authentication permanently, unexplained changes to content or templates (links redirected, templates edited by nobody the hotel knows), unusual use of admin accounts.
**Action.** Never send logins or passwords by e-mail; recreate access properly (an account with a role, a private hand-over). Disabling Wi-Fi authentication is only a time-boxed exception approved by the HSIA team and restored afterwards. Unexplained content or template changes go to a security review: establish which admin users changed what, reset their passwords, remove unknown users, then restore the content. Report the review outcome to the partner.
**Holds until.** The security review is closed and access is verified.
<!-- evidence: FW-006, FW-031, FW-187 -->

## 4. Where to escalate

Escalate with a package, not a forward. The team's first question should already be answered in what you attach.

### R&D

Takes reproduced or strongly suspected bugs, integration faults on our side, and data reconciliation. Attach: property; surface and version (TV app version from 1800 → Device, BSP APK version, HotSign build); room; time; steps; 1800 photos (Network, Device, Authorization); 1169 logs after reproducing; a video; an example order number or guest; screenshots with the address bar. Offer a debug session when the fault is intermittent. Status Push RND/Product/etc or On Hold; no ETA to the customer.
<!-- evidence: FW-028, FW-036, FW-135, FW-245 -->

### HSIA team

Takes MikroTik gateway configuration and replacement, DHCP/VLAN advice, HSIA portal backend faults, temporary open networks and failover questions. Attach: property; the room or the device MAC; the login method used; the exact text the captive portal shows; whether an IP was received; whether other rooms or areas work; what changed on the network; an on-site person with a phone. Support keeps tariffs, vouchers and per-property settings itself. The HSIA desk auto-resolves after 2 days without a reply.
<!-- evidence: FW-001, FW-027, FW-203, FW-180 -->

### Deployment team

Takes installations, server migrations, PMS webhook cut-overs, TV app and firmware campaigns, stream-service upgrades. Attach: property; what is to be updated and from which version; a maintenance window agreed with the partner (cloud updates can mean up to 1 hour of downtime); an on-site person to check one test TV first; any freeze the property has requested.
<!-- evidence: FW-010, FW-198, FW-047, FW-105 -->

### Content managers and the product manager

Content managers take menus, videos, display groups and welcome-page layout; attach the assets, the exact section, device types and languages. The product manager takes feature requests; attach the use case, who benefits and the behaviour the customer expects. The answer that comes back is a decision, never a date.
<!-- evidence: FW-144, FW-239, FW-241, FW-249 -->

### Project manager, account manager and third parties

The PM takes installation-stage properties, contracts and hand-over. The AM takes licences, renewals and anything with commercial risk. Third parties are reached through the hotel or partner: the key provider (SEOS errors), the POS vendor (table locks, SKUs), the PMS vendor (whitelisting, resync), the channel provider (streams), the ISP (blocked VPN), the TV manufacturer (firmware). We attach the evidence — the log line, the VLC test, the error text.
<!-- evidence: FW-198, FW-092, FW-204, FW-005, FW-153, FW-229 -->

## 5. Ask before answering

The eight gates live on [Ticket Intake Checklist](Ticket-Intake-Checklist). In short: Q-001 which property (partners manage many); Q-002 which surface (TV, WebApp, native app, tablet/BSP, Staff app, old or new admin panel, HSIA portal, HotSign); Q-003 scope — one room, several, or the whole property, the gate that sets severity; Q-004 a concrete example — room number, time, guest, order number; Q-005 evidence — screenshot with the address bar and error text, photo or video, 1800 photos, 1169 logs; Q-006 what changed — updates, power outage, network changes, new devices, PMS changes; Q-007 access and hands — remote access path and an on-site person; Q-008 which region/URL and which login option. Ask only the gate that blocks the next step, as one question. When a hard trigger is present, escalate first and ask in parallel.

## 6. Answer patterns

These behaviours are by design or documented; answer immediately and set Resolved.

### Overdue reminders repeat until Confirmed and Completed

Overdue-order e-mails are sent while an order stays unprocessed and repeat until it is Confirmed and then Completed; a backlog of unprocessed orders produces exactly this stream. Ask the hotel to process orders to the end and check who has permission to change statuses. A status that will not change on click is a different case — permissions, or statuses sent to the wrong regional API domain. "Stop at Confirmed" is a feature request (configurable notification settings are planned), not a bug.
<!-- evidence: FW-016, FW-196 -->

### Login fails before the PMS check-in is registered

A guest who tries the Wi-Fi portal or the TV before the PMS check-in has reached us gets an invalid-login error — not a fault. Compare the attempt times with the check-in time in the Guest list; the guest can log in once the check-in is there. The surname must be typed exactly as the PMS sent it; a different form or ending fails. If no check-ins are arriving at all, it is the PMS→CMS connection, not the portal.
<!-- evidence: FW-187, FW-174, FW-206 -->

### The Chromecast identifier changes between sessions

The number in the "Chromecast N TV" name a guest sees is assigned per session and changes after a pairing is dropped and relaunched — expected. Audio without picture from one Chromecast means no multicast from it: check its connection to the encoder and reboot it; excluding the device from the rotation is a workaround, not a fix.
<!-- evidence: FW-052 -->

### Out-of-hours orders are scheduled to the nearest slot

Ordering outside a section's working hours still goes through: "As Soon As Possible" is unavailable and the guest picks a time inside working hours, so the order is scheduled to the nearest slot. Long-standing behaviour. Hiding a section on a schedule is not possible; a disclaimer for out-of-hours orders is in the backlog. If an item can be ordered for delivery outside the configured hours, that is a bug — reproduce and escalate.
<!-- evidence: FW-159, FW-036 -->

### Partial channel outages belong to the provider or the network

When some channels fail — one language group, a few multicast addresses, lag on old sets — the cause is the channel provider, the headend or the hotel network: the TV app only tunes to the address. Ask for a VLC test from a laptop in the TV VLAN (Media → Open URL) on the affected addresses. If VLC plays fine and only old TVs lag, it is the TV hardware. All channels on all TVs failing is E-006.
<!-- evidence: FW-229, FW-061 -->

### Licences exhausted: "Guest" greeting and rooms without device data

A TV that cannot authorise shows "Guest" on the welcome screen although the PMS check-in is in the admin panel, and Connected devices lists the room with no model or MAC. Cause: TV licences exhausted (a "License Limit Exceeded" pop-up appears when cloning a new device). Remove devices unused for a long time, reboot the TV, verify registration. TV, Cast and tablet licences are separate counts; more licences go through the AM.
<!-- evidence: FW-168, FW-011, FW-204 -->

### No payment-method choice on the TV; Netflix depends on the TV model

The TV ordering flow has no card/cash choice; the alternative is the QR payment-gateway option. Netflix cannot be installed on TVIP set-top boxes; on supported Philips models (HFL6014U, HFL7111T) it is enabled in source settings and published. Bluetooth pairing is a TV feature we do not control. Full wording in [Unsupported Requests and Alternatives](Unsupported-Requests-and-Alternatives).
<!-- evidence: FW-140, FW-230, FW-243, FW-212 -->

## 7. Close patterns

### Non-support traffic

Auto-replies and out-of-office, tracker notifications, partner helpdesk acknowledgements, spam and offers, one-time codes, protected-message links we cannot open: close without a reply, except the encrypted link, which gets one reply asking for plain text. Details in [Support Operations](Support-Operations).
<!-- evidence: FW-096, FW-121, FW-099, FW-110, FW-114, FW-089 -->

### Resolved by the customer, or answered

The hotel fixed it before we looked: confirm in one line and close. A basic question answered from documentation: answer, set Resolved, close on confirmation. A configuration change done by Support: state what was changed and to what, then Resolved.
<!-- evidence: FW-181, FW-184, FW-212, FW-219, FW-142 -->

### No reply

Resolved tickets auto-close when the customer does not answer; the HSIA desk auto-resolves after 2 days. Before letting a Pending ticket lapse, send one reminder naming what is missing. Missed and empty chats close after one e-mail follow-up.
<!-- evidence: FW-117, FW-118, FW-235, FW-078 -->

## 8. The long-thread trap

### Escalate on the accumulated pattern

Some tickets never contain a single trigger message but become one over time. Chromecast unavailable for about three months, no site visit, the partner questioning the next project. A pricing bug opened early in the month, four "passed to the developers" replies, the partner counting the days. BSP control of the TVs lost "after every CMS update", fixed three times by a reboot before the root cause — the cloud provider blocking remote commands from one region — was found. Each reply was reasonable; the thread was not.
<!-- evidence: FW-025, FW-245, FW-188 -->

### How to break the loop

Count messages and calendar days, not only the latest symptom. At the second recurrence of the same fault, or the third "any update?", stop re-applying the workaround and escalate on the pattern: E-008 (same defect repeatedly or after a release), E-009 (older than 30 days without a dated plan), E-007 if commercial language appears. Write a summary at the top of the escalation — what happened when, what was tried, what changed each time — and send the same summary to the customer with a dated next step. A re-opened ticket inherits its history.
<!-- evidence: FW-188 -->
