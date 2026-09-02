<!-- meta
id: licensing-and-commercial-requests
type: process
audience: support
tags: [licenses, licence, tv license, cast license, license limit exceeded, tablets, smartpass, registration code, account manager, contract, invoice, quote, contact change, business development, non-support]
-->

# Licensing and Commercial Requests

**Read this when:** a ticket is about licence counts, a "License Limit Exceeded" pop-up, buying more licences, a contract, invoice or quote, a change of contact person, or a question about who supports what and where.

---

## 1. Licence types

### What is counted

- **TV licences** — one per connected TV or set-top box registered in the admin panel; rooms and their devices consume them.
- **Cast licences** — a separate count for casting (AcmeStream). "Rooms and casting" licences are two counts; raising the TV count does not move the Cast count. See [Casting, Chromecast and AirPlay](Casting-Chromecast-and-AirPlay).
- **Tablets** — counted separately from TVs; in-room tablets do not consume TV licences. See [In-Room Tablets and Room Control](In-Room-Tablets-and-Room-Control).
- **SmartPass / software registration codes** — the card-encoding software is registered per installation with a code; a temporary code bridges the gap until the permanent one is issued. See [Door Locks and Mobile Keys](Door-Locks-and-Mobile-Keys).
- **HotSign players** — signage players are managed in the HotSign CMS; how many players a property may run is a commercial question for the account manager like any other ([HotSign Digital Signage](HotSign-Digital-Signage)).
<!-- evidence: FW-138, FW-168, FW-204, FW-011, FW-161 -->

Support can read every count; only the commercial side changes what a property is entitled to.

## 2. How counts behave

### Rooms, test TVs and freeing licences

A room appears in the admin panel when a TV in it authorises for the first time. When the licences are exhausted the TV cannot authorise: the room is created but shows no device data (no MAC, no model in Connected devices) and the welcome screen greets "Guest" instead of the checked-in name. Cloning or registering a new device on a full count shows the pop-up "License Limit Exceeded". Test TVs — ours, the partner's, the head office's — consume licences exactly like room TVs. Devices that have not started for a long time can be removed to free their licences; the hotel does the clean-up in Connected devices, or asks us. A "new" TV that will not show its sections may be registered under a wrong room number while the count is full — see [Acme TV](Acme-TV).
<!-- evidence: FW-168, FW-138, FW-163 -->

### What support checks

We can see purchased and active counts in the CRM and in the portal, TV and Cast separately, and compare them with what the partner believes; ask for the "before" number when a purchase is reported. We remove our own test devices when we find them, tell the partner which other test devices we see (head office, integrator) and let them decide, and state the number of free licences after the clean-up. Never quote a count from memory or from an older ticket — read it at the time of writing.
<!-- evidence: FW-204, FW-138 -->

## 3. Buying more

### The procedure

More licences are a commercial purchase through the **account manager**; support neither sells nor promises counts. When the commercial process is complete, the account manager or the partner tells support the approved quantity and support raises the counts. "The increase is visible in the IPTV portal but the Cast count did not go up" is a two-count purchase applied to one count — have the partner confirm the before and after numbers for each count, apply the missing one, ask them to check. Copy the account manager on a licence thread that starts from a technical symptom.
<!-- evidence: FW-204, FW-138 -->

### Typical wording

"You currently have N purchased licences and N active TV connections, which is why the pop-up appears. If you plan to add TVs, additional licences need to be purchased through your account manager, whom I am adding to this thread. Meanwhile I have removed our own test TV; we also see test devices belonging to your head office — please check whether those can be removed. You have M free licences now." Numbers come from the CRM at the time of writing; the reply names the counts, not the price.
<!-- evidence: FW-138 -->

## 4. Contracts, invoices and quotes

### Route, do not answer

Signed contracts sent to the support address are forwarded to the **project manager** with a one-line acknowledgement; renewals, invoices, quotes and pricing questions go to the **account manager**. Commercial proposals arriving from third parties — an ISP offering tariffs, a vendor mailing a price list — are non-support: close without reply. Commercial-risk language inside a technical ticket (renewal at stake, "we will recommend to the owners", remediation plan requested, senior management copied) is E-007 in [Escalate or Answer](Escalate-or-Answer): account manager plus L2 within one business day. Categories and non-support traffic are in [Support Operations](Support-Operations).
<!-- evidence: FW-092, FW-114 -->

## 5. Contacts and account admin

### Contact changes and "who replaced whom"

A partner contact announcing a new e-mail address: update the contact in Zoho Desk, confirm, close as administrative — the old mailbox may keep working for a while, but future correspondence goes to the new one. When a customer asks who succeeded a person who left (for example the Business Development contact for a region), do not put names in the ticket: name the role, and share the corporate address separately. Out-of-office and "no longer with the company" auto-replies landing in the queue are not new requests — keep them in the thread they answer, and if the sender has left, ask the partner for the new contact ([Support Operations](Support-Operations)).
<!-- evidence: FW-077, FW-209 -->

## 6. Support geography and scope limits

### Where we do not support

Electronic locks on OS Access are supported by Acme Support in Russia only; outside Russia, refer to the manufacturer's documentation and the installing partner — we hold no list of regional lock partners ([Door Locks and Mobile Keys](Door-Locks-and-Mobile-Keys)). Properties still in the installation stage are handled through the project channels (project manager, deployment team), not through the support queue; a ticket from such a property is forwarded to the PM. End-of-life hardware limits what we can promise: for old TV models already on their latest firmware, an application update cannot fix platform behaviour, and the honest answer is replacement rather than an R&D case. Unsupported requests and what to offer instead: [Unsupported Requests and Alternatives](Unsupported-Requests-and-Alternatives).
<!-- evidence: FW-011, FW-219 -->

## 7. Request patterns

### Pattern — "License Limit Exceeded" when cloning or adding a device
**Symptom.** A pop-up "License Limit Exceeded" while cloning a spare set-top box or registering a new TV.
**First checks.** Purchased vs active count in the CRM; test devices on the list (ours, head office); does the partner plan more TVs.
**Typical cause.** Active connections equal purchased licences.
**Owner.** Acme Support (counts, clean-up); Account manager (purchase).
**Fix or answer.** Remove our test devices, point out theirs, state the free count; more TVs need a purchase through the account manager — add them to the thread.
<!-- evidence: FW-138 -->

### Pattern — Rooms without device data; TV greets "Guest" after a PMS check-in
**Symptom.** Guest data is in the admin panel but the TV shows "Guest"; Connected devices has rooms with no MAC or model; a TV in one room lacks a section others have.
**First checks.** 1800 photos (Network, Authorization); licence count; TVs not started for a long time; TV registered under the right room number.
**Typical cause.** Licences exhausted, so the TV cannot authorise; sometimes a wrong room number.
**Owner.** Acme Support.
**Fix or answer.** Remove long-unused devices to free licences, reboot the TV, check registration (1105 to re-register); explain that rooms are created on authorisation.
<!-- evidence: FW-168, FW-163 -->

### Pattern — Purchased licences not applied; Cast count did not increase
**Symptom.** A partner reports a completed purchase; the TV count shows the increase, the Cast count does not.
**First checks.** Approval from the account manager; before/after for TV and for Cast separately.
**Typical cause.** Two-count purchase applied to one count.
**Owner.** Acme Support after commercial approval.
**Fix or answer.** Apply the missing count, ask the partner to verify, note both numbers in the ticket.
<!-- evidence: FW-204 -->

### Pattern — "Are tablets counted against TV licences?" and other count questions
**Symptom.** A licensing question tacked onto a technical ticket.
**First checks.** Which count is meant (TV, Cast, tablets).
**Typical cause.** Not a fault.
**Owner.** Acme Support; Account manager for entitlement.
**Fix or answer.** Tablets are counted separately from TVs; TV and Cast are separate counts; entitlement changes go through the account manager. Answer briefly and keep the technical thread on its subject.
<!-- evidence: FW-011, FW-204 -->

### Pattern — Software registration code requested
**Symptom.** SmartPass asks for a registration code after a reinstall; arrivals are today.
**First checks.** Hotel card with the details; the code shown by the program; property in Russia.
**Typical cause.** Reinstall cleared the registration.
**Owner.** Acme Support.
**Fix or answer.** Issue a temporary code immediately, then the permanent one; send codes to the property's contact only.
<!-- evidence: FW-161 -->

### Pattern — Contract, invoice, quote or third-party proposal in the queue
**Symptom.** A signed contract, an invoice question, a request for a quote, or an unsolicited commercial offer arrives at support.
**First checks.** Is it from a customer (route) or from a vendor selling to us (non-support).
**Typical cause.** Administrative traffic.
**Owner.** Project manager (contracts); Account manager (invoices, quotes, renewals); nobody (third-party offers).
**Fix or answer.** Forward with a one-line acknowledgement and close; third-party proposals are closed without reply. Never discuss prices from support.
<!-- evidence: FW-092, FW-114 -->

### Pattern — Contact person changed; who is the new contact on our side
**Symptom.** "My e-mail changed, please update", or "who replaced your Business Development lead?"
**First checks.** Which partner and property the contact belongs to; is the request from the contact themselves.
**Typical cause.** Staff changes on either side.
**Owner.** Acme Support (Zoho contact); Business Development or Account manager for their own contacts.
**Fix or answer.** Update the contact and confirm; for our side give the role and share the address separately; auto-replies from leavers are not tickets.
<!-- evidence: FW-077, FW-209 -->

### Pattern — "Do you support this in our region?"
**Symptom.** An outsourcer or a new IT contractor asks whether we support the lock system (or another product) at a property outside Russia.
**First checks.** Property location; which product; is the property live or still in installation.
**Typical cause.** Support-boundary question.
**Owner.** Acme Support answers; PM for installation-stage properties.
**Fix or answer.** Locks: Russia only, manufacturer's documentation elsewhere, no partner list. Other products: normal support via the partner; installation-stage sites go through the PM.
<!-- evidence: FW-219 -->
