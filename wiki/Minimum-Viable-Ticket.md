<!-- meta
id: fsg-minimum-viable-ticket
type: decision
audience: triage
tags: [intake, required-information, clarification, incomplete, ask, gate]
-->

# Minimum Viable Ticket

**Owner:** Facility Support Group — Service Delivery
**Purpose:** the information required before a ticket can be worked, the questions that
obtain it, and the points at which work must stop until it arrives.

---

## Why this page exists

Around a fifth of inbound requests cannot be worked as received, and a smaller number
contain no actionable statement at all. The failure mode is not that these tickets are
hard — it is that they get *answered anyway*, from an assumption about what the reporter
probably meant.

An assumption that is wrong costs more than the question would have. This page defines
where to stop.

---

## 1. The universal four

Required on every ticket regardless of type. A ticket missing any of these is not ready
to be worked.

| # | Field | Why it is required |
|---|---|---|
| **Q-001** | Facility identifier | Resolved to the licensing record, not the operator's name for it |
| **Q-002** | Symptom, and what was expected instead | Distinguishes a defect from a misunderstanding |
| **Q-003** | Scope — one chamber, or the whole facility | **Sets severity.** Ask even when you think you know |
| **Q-004** | When it started, and what changed at the site | Recent changes are the single highest-yield question |

**Q-001 is resolved at triage, while the thread is fresh.** Operators refer to facilities
by commercial name, by internal code, by building, and occasionally by the person who
manages it. Reconstructing this three weeks later from context is unreliable and has twice
resulted in work performed at the wrong site.

Multi-facility operators are the trap: a thread opened about one facility that drifts to
another halfway down without anyone saying so. If the subject matter changes facility,
split the ticket.

---

## 2. Additional requirements by category

### Q-010 — Technical issue
Subsystem; whether a workaround exists; verbatim error text or a photograph. For display
faults, the on-device diagnostic log — from the main menu, enter **`1169`**.

### Q-011 — Basic question
Whether this concerns current behaviour or a purchasing decision. A capability question
that is really a pre-sales question is answered jointly with the account team, not
unilaterally by FSG.

### Q-012 — Content update request
The scope level (brand, facility, zone, chamber class, chamber); the surface; the current
state as a photograph; the intended state as **text or the asset itself**; the required
live date. Brand-level changes additionally require written approval from the operator's
brand contact, because they reach every facility they run.

Text transcribed from a photograph will contain an error, and that error will be on
several hundred displays. Require text as text.

### Q-013 — Feature development request
The operator's underlying problem, **not their proposed solution**. Affected facilities.
Whether a workaround exists. Whether it is contractually committed. A request arriving as
a solution with no problem statement will be returned by Product.

---

## 3. Hard gates

Work stops here. These are not preferences.

| Gate | Rule |
|---|---|
| **Q-020** | Never diagnose without a facility identifier |
| **Q-021** | Never assign severity without scope |
| **Q-022** | Never accept a content change without a required live date |
| **Q-023** | Never action a stranded requisition without a written request naming who asked |
| **Q-024** | Never perform a disruptive restart without written operator agreement |

On **Q-024**: a verbal agreement recorded by you in the ticket is not sufficient. "Go
ahead" in a chat window is.

---

## 4. When there is no question at all

Requests arrive containing a subject line and nothing else — a chat session opened with
"Support help", no body, no identification, no reply before the session ended
([FW-235](https://github.com/podlodka-ai-club/flywheel/issues/235)).

**Do not infer what the reporter wanted.** Acknowledge, ask, set On Hold with the
outstanding question recorded.

Equally, **do not send a generic request for more information**, which produces a generic
non-answer and a second round trip. Ask the specific things you need.

### Standard clarification

> Thanks for getting in touch. So that we can pick this up quickly, could you confirm:
>
> 1. Which facility this concerns.
> 2. What you are seeing, and what you expected instead.
> 3. When it started, and whether anything changed at the site around that time.
> 4. Whether it affects one chamber or the whole facility.
>
> A photograph of the affected display is usually the fastest way to get us to the answer.

---

## 5. Do not ask for what you already have

**The most common intake error is not failing to ask — it is asking for information the
ticket already contains.**

Email accounts for the large majority of inbound volume, and email tickets arrive with
*too much* rather than too little: a forwarded chain carrying the operator's internal
discussion, their subcontractor's findings, and sometimes a third-party vendor's diagnosis.
The answer is frequently already in it, several messages down, written by someone who is
not the sender.

Read the whole chain before replying. Asking an operator for something their own engineer
already supplied is the fastest way to lose their confidence, and it is quoted back during
service reviews.

---

## 6. Photographs

A large proportion of estate faults are visible only on the chamber display itself, and an
affected device is by definition not reporting to us. The photograph is frequently the
only evidence in existence.

Ask early rather than as a last resort, and ask for it specifically:

- The error as displayed, not a description of it.
- For display faults, the diagnostic log at code `1169`.
- For content faults, the current state *and* what the console shows.

Requesting a photograph is not a delaying tactic. It is usually the diagnostic.

---

## 7. Before a ticket leaves triage

- [ ] Facility identified against the licensing record
- [ ] Category assigned — and it is not Uncategorised
- [ ] Severity assigned by FSG, not inherited from the reporter's wording
- [ ] Scope established: one chamber, or many
- [ ] Subject-safety trigger considered and explicitly ruled in or out
- [ ] Multi-issue threads split, and the operator told they were split
- [ ] Status set to something truthful about who is blocked
- [ ] First response sent within the target for the assigned severity

**Uncategorised is not a category.** It is the absence of triage, and it is permitted only
where the ticket is genuinely unreadable *and* a clarification has already been sent. In
that case: Uncategorised, On Hold, outstanding question recorded. Anything else is a triage
failure.

If a ticket does not fit cleanly, pick the closest category and note the ambiguity. A
slightly wrong category routes; no category does not.
