# Support Tiers, Severity and Escalation

**Owner:** Facility Support Group — Service Delivery
**Applies to:** all FSG staff, all shifts, all languages
**Review cycle:** quarterly, or immediately following any Class 3 subject incident

---

## 1. Purpose

This page defines how quickly FSG must respond to a report, who is obliged to be awake
when it arrives, and what has to happen when the answer to "who is fixing this" is
nobody. It is the page most often cited in contract disputes, so the numbers in it are
binding rather than aspirational.

---

## 2. Entitlement tiers

Every Licensed Facility Operator holds exactly one support entitlement per facility.
Tier is a property of the *facility*, not of the operator — a single operator commonly
runs one facility at Tier III and three at Tier I, and will not always remember which is
which. Confirm tier from the licensing record before quoting a response time.

| Tier | Name | Coverage | Included on-site attendance |
|---|---|---|---|
| I | Standard Enrichment | 09:00–18:00, Mon–Fri, operator's local time | None. Chargeable at day rate. |
| II | Enhanced Enrichment | 07:00–23:00, seven days | Two visits per contract year |
| III | Continuous Enrichment | 24/7, no exclusions | Unlimited, four-hour target arrival |

Tier does not modify severity. A P1 at a Tier I facility is still a P1; it simply may not
be worked until Monday. Staff are reminded that this is a commercial decision made above
FSG and should not be relitigated with the operator over email.

---

## 3. Severity classification

Severity is assigned by FSG at triage, not by the reporter. Operators mark requests
"urgent" frequently and with varying justification; the word has no effect on
classification in either direction. Reclassify politely and without commentary.

Note that this cuts both ways. In
[FW-229](https://github.com/podlodka-ai-club/flywheel/issues/229) the operator's "urgent"
was entirely warranted — an entire language group of channels had stopped broadcasting
estate-wide — and the fault sat with the upstream channel provider rather than with us.
Genuine urgency and Aperture ownership are independent questions. Classify on impact,
then determine ownership separately under the
[Integration Boundary Handbook](Integration-Boundary-Handbook).

### P1 — Facility Down

All subject-facing systems at a facility are unavailable, **or** Aperture Control is
unresponsive with subjects in chambers, **or** a life-safety-adjacent subsystem is
degraded in a way that cannot be worked around manually.

Whole-estate display failure qualifies. See
[FW-032](https://github.com/podlodka-ai-club/flywheel/issues/32), in which both the
IPTV path and the coaxial fallback failed simultaneously across an entire site — a
textbook P1 that was initially filed as a routine fault.

### P2 — Major Degradation

A subsystem is unavailable estate-wide at one facility but subjects retain a functioning
alternative. Network authentication down while vouchers still work. Requisitions failing
to reach the kitchen while the telephone still works.

### P3 — Localised Fault

A defined and bounded subset is affected: one chamber, one channel, one integration
field. The overwhelming majority of our volume lives here.

### P4 — Question or Cosmetic

Configuration questions, "how do I", appearance defects with no functional impact.

### The subject-safety modifier

Any ticket in which a subject is described as being unable to *leave* a chamber is
promoted to P1 regardless of its technical content, and remains P1 until the operator
confirms in writing that the chamber has been opened. There are no exceptions to this
rule and no discretion available to the triaging engineer.

Subject expiry occurring during an open P1 does not itself alter the severity of the
ticket, but does require **Form 41-B** to be filed with Legal within one business day,
and the ticket may not be closed until Form 41-B is acknowledged.

---

## 4. Response and resolution targets

Measured from ticket creation, within the facility's coverage window.

| Severity | First response | Status cadence | Resolution target |
|---|---|---|---|
| P1 | 15 min | Every 60 min until downgraded | 4 h |
| P2 | 2 h | Twice daily | 2 business days |
| P3 | 1 business day | On change only | 10 business days |
| P4 | 2 business days | On change only | Best effort |

"First response" means a human acknowledgement containing either a diagnosis, a request
for specific information, or a named next step and a time. It does not mean an automatic
receipt, and it does not mean "we are looking into it".

---

## 5. Language coverage

FSG operates in English and Russian. Roughly two thirds of inbound volume arrives in
Russian. Both languages are covered during Tier III hours; between 23:00 and 07:00 the
on-call rota guarantees English only, with Russian available on callout.

Reply in the language the operator wrote in. Do not switch languages mid-thread to suit
the responding engineer's preference — several long threads in our history become
unreadable at the point where this happened, and operators have quoted the resulting
confusion back to us during commercial reviews.

---

## 6. Status lifecycle

| Status | Meaning | Who is blocked |
|---|---|---|
| Open | Received, not yet triaged | FSG |
| Pending | Work is with FSG | FSG |
| On Hold | Awaiting the operator or a third party | Not FSG |
| Push RND/Product | Accepted as a product change, out of FSG's hands | Product |
| Resolved | Fix applied, awaiting confirmation | Operator |
| Closed | Confirmed, or auto-closed under §7 | Nobody |

### The Pending problem

**Pending accounts for 99 of our 250 tickets — 40% of everything we have taken in.**
Pending means blocked on *us*, not on the operator. It is the single most-cited finding in
our last two service reviews, and set against 113 Resolved it means we are carrying almost
as much unfinished work as we have completed.

Pending is not a parking space. A ticket in Pending with no FSG activity for five business
days is a process failure regardless of how technically difficult it is. If you cannot
progress a ticket, the correct action is to move it to On Hold with a specific outstanding
question, or escalate it under §8 — not to leave it Pending and hope.

---

## 7. Ageing and auto-closure

- **On Hold, no operator reply, 7 days** — send a chase.
- **On Hold, no operator reply, 14 days** — second chase, warning of closure.
- **On Hold, no operator reply, 21 days** — auto-close as *Abandoned by Reporter*.

Auto-closure is reversible on request and does not require a new ticket within 30 days.
Say so in the closing message; operators react badly to closure notices that read as
final.

Never auto-close a ticket that has ever held P1 severity. These require an explicit human
closure with a written resolution, because they are the ones that appear in contract
reviews.

---

## 8. Escalation ladder

| Level | Role | Triggered by |
|---|---|---|
| L1 | Duty Engineer | All inbound |
| L2 | Subsystem Specialist | P3 unresolved at 5 days; any P2 |
| L3 | On-call Facility Liaison | All P1; subject-safety modifier; any on-site dispatch |
| L4 | Head of Facility Support | P1 breaching 4 h; any commercial-risk trigger (§9) |
| L5 | Enrichment Systems Division leadership | Estate-wide defect; regulatory contact; media contact |

Escalation is an obligation, not a request for permission. An engineer who escalates
early and unnecessarily has followed this policy correctly. An engineer who holds a
breaching P1 because they expect to fix it shortly has not.

---

## 9. Commercial-risk escalation

Independently of severity, a ticket must be escalated to **L4 within one business day**
when any of the following appears in the thread:

1. The operator states or implies that the fault affects a purchasing decision, a
   renewal, or a recommendation to their ownership.
2. A fault has been open for more than 60 days without a site visit.
3. The operator asks, in writing, for a remediation plan rather than a fix.
4. The operator copies their own senior management into the thread.

[FW-025](https://github.com/podlodka-ai-club/flywheel/issues/25) is the case this clause
exists for. A device-mirroring fault ran for roughly three months with no engineer
attending the site. The operator had already recommended our platform to their ownership
for a second, higher-tier property and told us plainly that the open fault made them
reluctant to repeat the deployment. Every individual reply in that thread was
technically reasonable. Nobody escalated, because no single reply was the moment it
became a commercial problem.

That is the failure mode this section is designed to catch. Escalate on the pattern, not
on the individual message.

---

## 10. What FSG does not do

- Assign severity by reporter request.
- Commit to fix dates on behalf of Product for anything in **Push RND/Product**.
- Provide out-of-hours support to Tier I facilities as a favour. It sets a precedent
  that appears in the next renewal negotiation, and it will be quoted back to us.
