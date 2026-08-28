# Request Intake and Triage Standard

**Owner:** Facility Support Group — Service Delivery
**Applies to:** every ticket, at the moment it arrives
**Compliance:** triage quality is sampled weekly; the sample is 20 tickets

---

## 1. Purpose

Triage is the ten minutes that determine whether a ticket takes two days or two months.
A correctly triaged ticket carries its severity, its category, its facility, and enough
information for the next engineer to start work without reading the whole thread. An
incorrectly triaged ticket carries none of that and is re-triaged, badly, by everyone who
touches it afterwards.

This page defines what "correctly triaged" means.

---

## 2. Channels

| Channel | Share | Character |
|---|---|---|
| Email | 78% | Long, forwarded, context-rich, often multi-issue |
| Web form | 19% | Structured, short, frequently under-specified |
| Chat | 2% | Immediate, almost always under-specified |

Each channel fails differently and needs a different opening move.

**Email** arrives with too much rather than too little: a forwarded chain containing the
operator's internal discussion, their subcontractor's findings, and sometimes a
third-party vendor's diagnosis. Read the whole chain before replying. The answer is
frequently already in it, several messages down, written by someone who is not the sender.

Email's real failure mode is **multiple unrelated issues in one thread**. Split them at
triage — see §6. A thread carrying three faults will resolve at the speed of the slowest
and all three will be reported as slow.

**Web form** gives structure but little substance. Expect to ask for facility identifier,
scope, and timing on almost every one.

**Chat** produces the least usable tickets in our estate. It is also where the reporter
is most likely to still be present and able to answer, so a single well-aimed question
during the session is worth more than any amount of later analysis.

---

## 3. Category taxonomy

Exactly one category per ticket, assigned at triage.

| Category | Use when | Share |
|---|---|---|
| **Technical issue** | Something that worked, or should work, does not | 54% |
| **Basic question** | Information request, "how do I", capability question | 15% |
| **Content update request** | A change to what appears on chamber displays | 4% |
| **Feature development request** | Platform behaviour that does not exist yet | 2% |
| **Customisation** | Facility-specific appearance or configuration | <1% |
| **Configuration** | A setting change within existing capability | <1% |
| **Escalation** | Formal escalation of an existing ticket | <1% |
| **Non-support** | Commercial, contractual, administrative, or misdirected | <1% |
| **Uncategorised** | See §4 | 22% |

---

## 4. The uncategorised problem

**Roughly one ticket in five is never categorised at all.** This is the largest single
quality defect in FSG's intake process and it is the reason this page exists in its
current form.

Uncategorised tickets are invisible to every routing rule, every specialist queue, and
every report we produce. They are worked, when they are worked, by whoever happens to
read them. They age faster than any other class of ticket and they are heavily
over-represented in our On Hold backlog.

Uncategorised is not a category. It is the absence of triage. It is permitted in exactly
one circumstance: the ticket is genuinely unreadable and a clarification has already been
sent under §5. In that case set Uncategorised, set On Hold, and record the outstanding
question. Anything else is a triage failure and will be flagged in the weekly sample.

If a ticket does not fit cleanly, pick the closest category and note the ambiguity in a
comment. A slightly wrong category routes; no category does not.

---

## 5. Insufficient information

A material number of inbound requests contain no actionable statement at all.
[FW-235](https://github.com/podlodka-ai-club/flywheel/issues/235) is the pure form: a
chat session opened with the subject "Support help", no question text, no operator
identification, and no reply before the session ended.

The rule: **acknowledge, ask one specific question, and set On Hold.** Do not attempt to
infer what the reporter wanted, and do not send a generic "please provide more
information", which produces a generic non-answer.

### Standard clarification

> Thanks for getting in touch. So that we can pick this up quickly, could you confirm:
>
> 1. Which facility this concerns.
> 2. What you are seeing, and what you expected instead.
> 3. When it started, and whether anything changed at the site around that time.
> 4. Whether it affects one chamber or the whole facility.
>
> A photograph of the affected display is usually the fastest way to get us to the
> answer.

Question 4 is the one that sets severity. Ask it even when you think you know.

Photographs deserve particular emphasis. A large proportion of our estate's faults are
only visible on the chamber display itself, and the affected device is by definition not
reporting to us. Asking for a photograph is not a delaying tactic; it is frequently the
diagnostic.

---

## 6. Required information by category

### Technical issue
Facility identifier; scope (one chamber / wing / whole facility); subsystem; first
occurrence; recent changes; whether a workaround exists; photograph or verbatim error
text. For display faults, the on-device diagnostic log — from the main menu, enter
**`1169`**.

### Basic question
Facility identifier; whether this is about current behaviour or a purchasing decision.
The second half matters: a capability question that is really a pre-sales question should
be answered jointly with the account team, not unilaterally by FSG.

### Content update request
Facility identifier; exactly which surface; the current content; the intended content;
the assets; the required live date. See
[Content Publishing and Change Control](Content-Publishing-and-Change-Control) §4.

### Feature development request
The operator's underlying problem, not their proposed solution. Which facilities are
affected. Whether a workaround exists. Whether it is contractually committed. This is
what Product needs; a request that arrives as a solution with no problem statement will
be returned.

---

## 7. Bug, or feature request?

The distinction is contractual, not technical, and operators will dispute it.

> If the platform is not doing what it is documented to do, it is a **bug**.
> If it is doing what it is documented to do and the operator wants something else, it is
> a **feature development request**.

The awkward middle is behaviour that is undocumented. Default to **bug** when the current
behaviour is plainly unreasonable, and route to Product with a note. Do not use the
absence of documentation as a reason to decline.

Accepted feature requests move to **Push RND/Product**. Once there:

- FSG no longer owns delivery and must not quote a date. Ever, in any form, however
  hedged. A hedged date is remembered as a date.
- FSG still owns the *relationship*. Update the operator when the status changes, and
  close the loop when it ships.
- Tickets in Push RND/Product are exempt from the ageing and auto-closure rules in
  [Support Tiers, Severity and Escalation](Support-Tiers-Severity-and-Escalation) §7, but
  must be reviewed monthly. Only four tickets currently sit in this state — small enough
  that there is no excuse for one going unreviewed, and small enough that an operator
  discovering their request was silently dropped will be entirely justified.

### Fleet-wide defects

If a fault has been seen at more than one facility, say so in the ticket and raise it as
a fleet-wide defect regardless of how minor it looks.

Operators ask us to do this themselves —
[FW-010](https://github.com/podlodka-ai-club/flywheel/issues/10) is one asking, entirely
reasonably, whether a known defect should be pushed to all customers proactively rather
than waiting for each site to report it. They are right, and the answer is yes. The value
of the second report is not the second fix; it is the evidence that it is not local.

---

## 8. Facility identification

Every ticket must carry a facility identifier before it leaves triage. No exceptions.

Operators refer to facilities by commercial name, by their own internal codes, by the
name of the building, and occasionally by the name of the person who manages it. Resolve
to the licensing identifier at triage, while the thread is fresh. Reconstructing it three
weeks later from context is unreliable and has twice resulted in work being performed at
the wrong site.

Multi-facility operators are the common trap: a thread opened about one facility that
drifts to another halfway down without anyone saying so. If the subject matter changes
facility, split the ticket.

---

## 9. Splitting and merging

**Split** when a thread contains two faults with different subsystems, different
severities, or different facilities. Cross-reference both ways, and tell the operator you
have done it and why — an unannounced split reads as the original request being ignored.

**Merge** when the same fault arrives twice: commonly from the operator's helpdesk and
their engineer independently, hours apart. Keep the one with better information, not the
earlier one. Say which you kept.

---

## 10. Triage checklist

Before a ticket leaves triage:

- [ ] Facility identified against the licensing record
- [ ] Category assigned — and it is not Uncategorised
- [ ] Severity assigned by FSG, not inherited from the reporter's wording
- [ ] Scope established: one chamber, or many
- [ ] Subject-safety modifier considered and explicitly ruled in or out
- [ ] Multi-issue threads split
- [ ] Status set to something truthful about who is blocked
- [ ] First response sent within the target for the assigned severity
