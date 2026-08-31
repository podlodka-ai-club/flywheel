<!-- meta
id: fsg-escalate-or-answer
type: decision
audience: triage
tags: [escalation, severity, p1, safety, decision, answer, route]
-->

# Escalate or Answer: Decision Boundaries

**Owner:** Facility Support Group — Service Delivery
**Purpose:** the single decision surface for whether a ticket is answered, questioned, or
escalated. Consolidates rules otherwise spread across
[Support Tiers, Severity and Escalation](Support-Tiers-Severity-and-Escalation) and the
product pages.

---

## The decision

Every inbound ticket resolves to exactly one of four outcomes:

| Outcome | When |
|---|---|
| **Escalate** | A trigger in §1 is present |
| **Ask** | Required information is missing (§3) |
| **Answer** | The question is answerable from documentation and no trigger applies |
| **Close** | Non-support traffic (§4) |

Escalation is an obligation, not a request for permission. Escalating early and
unnecessarily is correct behaviour. Holding a breaching P1 because you expect to fix it
shortly is not.

---

## 1. Hard escalation triggers

Presence of any one of these escalates regardless of everything else in the ticket. They
are not weighed against each other and they are not subject to engineer discretion.

### E-001 — A subject cannot leave a chamber
**Action.** P1 immediately. Page the on-call Facility Liaison before diagnosing.
**Holds until.** The operator confirms **in writing** that the chamber has been opened.
**Never.** Downgraded by any engineer, for any reason.
**Note.** Applies on suspicion. "Unknown" counts as yes.

### E-002 — Subject data survives a departure
Credentials, signed-in sessions, personalisation, or identity belonging to a departed
subject remain available to the next occupant.
**Action.** Data-protection path. Not a display bug, not cosmetic, not queued.
**Evidence.** [FW-157](https://github.com/podlodka-ai-club/flywheel/issues/157),
[FW-132](https://github.com/podlodka-ai-club/flywheel/issues/132)

### E-003 — A payment exists with no matching requisition
A subject has been charged for something nobody is preparing.
**Action.** Financial-integrity escalation. Do not wait for the operator to reconcile.
**Evidence.** [FW-088](https://github.com/podlodka-ai-club/flywheel/issues/88)

### E-004 — Subject-supplied notes reach staff incomplete
Truncation of the free-text note on a requisition. Subjects record dietary restrictions
there.
**Action.** Safety escalation, regardless of which side of the integration owns the
truncation.
**Evidence.** [FW-248](https://github.com/podlodka-ai-club/flywheel/issues/248)

### E-005 — Consumption is not posting to subject accounts
**Action.** Financial. Investigate the whole affected period, not only the instances the
operator noticed. These failures are silent by construction and are found by
reconciliation or not at all.
**Evidence.** [FW-021](https://github.com/podlodka-ai-club/flywheel/issues/21)

### E-006 — Commercial-risk language
Any of: the fault is said to affect a purchasing decision, a renewal, or a recommendation;
a remediation plan is requested rather than a fix; the operator copies in their own senior
management.
**Action.** L4 within one business day.
**Evidence.** [FW-025](https://github.com/podlodka-ai-club/flywheel/issues/25)

### E-007 — A fault has run more than 60 days without a site visit
**Action.** L4. Age alone is the trigger; no other condition required.
**Evidence.** [FW-025](https://github.com/podlodka-ai-club/flywheel/issues/25)

### E-008 — The same defect exists at more than one facility
**Action.** Raise as a fleet-wide defect regardless of how minor it appears. The value of
the second report is not a second fix — it is the evidence that the defect is not local.
**Evidence.** [FW-010](https://github.com/podlodka-ai-club/flywheel/issues/10)

---

## 2. The trap in E-006

**The commercial-risk trigger is the one most often missed, and it is missed by pattern
rather than by carelessness.**

In [FW-025](https://github.com/podlodka-ai-club/flywheel/issues/25) a mirroring fault ran
roughly three months with no engineer attending the site. The operator had recommended the
platform to their ownership for a second, higher-tier property and said plainly that the
open fault made them reluctant to repeat the deployment.

Every individual reply in that thread was technically reasonable. Nobody escalated, because
no single message was the moment it became a commercial problem.

**Escalate on the accumulated pattern, not on the individual message.** When assessing a
long thread, read it whole before deciding — the trigger is frequently visible only across
messages, and never in the most recent one.

---

## 3. Ask, do not answer

Where the following are missing, the correct action is one specific question and On Hold —
not a diagnosis, and not a generic request for more information.

| Gate | Missing | Ask |
|---|---|---|
| **E-020** | Facility identifier | Which facility this concerns |
| **E-021** | Scope | One chamber or the whole facility |
| **E-022** | Any actionable statement | What they are seeing and what they expected |
| **E-023** | Timing | When it started, and what changed at the site |

Scope is the gate that sets severity. Ask it even when you think you know.

**E-022 in its pure form** is a request containing no question at all — a chat session
opened with a subject line and no body
([FW-235](https://github.com/podlodka-ai-club/flywheel/issues/235)). Do not infer what the
reporter wanted. Acknowledge, ask, hold.

**Do not ask for what the thread already contains.** Forwarded email tickets frequently
carry the answer several messages down, written by the operator's own engineer or their
vendor. Read the whole chain first; asking for information already supplied is the fastest
way to lose an operator's confidence.

---

## 4. Do not escalate

Listed because each has been escalated in error, and over-escalation degrades the signal
of the triggers in §1.

### E-030 — The reporter said it was urgent
Not a trigger. Severity is FSG's assignment. Note that urgency can be genuine and the
fault still not ours — an estate-wide outage owned by an upstream provider is both.
**Evidence.** [FW-229](https://github.com/podlodka-ai-club/flywheel/issues/229)

### E-031 — A whole-facility report that has not been verified from our side
Confirm the platform's health from Aperture infrastructure first. A meaningful fraction of
reported outages are healthy platforms and an operator-side access path — one resolved on
retry, having been merely slow to load.
**Evidence.** [FW-200](https://github.com/podlodka-ai-club/flywheel/issues/200)

### E-032 — A cosmetic defect on a single surface
Real, worth fixing, P3 or P4. An unclear control on the subject portal has an operational
cost, but it is not an escalation.
**Evidence.** [FW-240](https://github.com/podlodka-ai-club/flywheel/issues/240)

### E-033 — Automated notifications from a third-party helpdesk
Cross-vendor threads generate their own CC and acknowledgement traffic, which arrives here
and opens tickets carrying no content. Triage **Non-support** and close.
**Evidence.** [FW-232](https://github.com/podlodka-ai-club/flywheel/issues/232)

### E-034 — A question about where to find something
Answer with the navigation path. A question about where something lives is answered by
saying where it lives.
**Evidence.** [FW-222](https://github.com/podlodka-ai-club/flywheel/issues/222)

### E-035 — A control the reporter cannot see
Check their role first. Permissions hide controls rather than disabling them, so a user
without a permission reports the function as missing rather than as forbidden. This is the
fastest disproof available and it is right more often than not.
**Evidence.** [FW-195](https://github.com/podlodka-ai-club/flywheel/issues/195)

---

## 5. Severity, in one table

| Severity | Condition |
|---|---|
| **P1** | All subject-facing systems down at a facility; or aperture control unresponsive with subjects in chambers; or any E-001 |
| **P2** | A subsystem down estate-wide at one facility, with a working alternative for subjects |
| **P3** | Bounded subset — one chamber, one channel, one field |
| **P4** | Question, or cosmetic with no functional impact |

Whole-estate failure of a primary path *and* its independent fallback is P1, and the
simultaneity is itself diagnostic: it points at something the two share rather than at two
coincident faults ([FW-032](https://github.com/podlodka-ai-club/flywheel/issues/32)).
