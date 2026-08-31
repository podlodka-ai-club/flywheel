<!-- meta
id: fsg-unsupported
type: decision
audience: triage
tags: [unsupported, refusal, alternative, cannot, not-possible, policy]
-->

# Unsupported Requests and Their Alternatives

**Owner:** Facility Support Group — Service Delivery
**Purpose:** the authoritative list of things Aperture does not do, each with the
alternative we offer instead.

---

## How to use this page

Every entry is self-contained: the request as operators phrase it, the answer, the reason,
and the supported alternative. Entries are stable and citable by identifier.

**A refusal is never sent alone.** Every entry below carries an alternative, and the
alternative goes in the same message as the answer. A bare "that is not supported" is what
converts a routine question into an escalation.

If a request is not listed here, it is not thereby unsupported — it is undocumented. Ask
Service Delivery rather than inferring a refusal from this page's silence.

---

### U-001 — Running the subject network without authentication

**Request.** "Please disable authentication so subjects can connect while you fix this."
**Answer.** No.
**Why.** An unauthenticated subject network cannot attribute traffic, which removes the
operator's ability to meet their own legal obligations, and makes per-subject entitlement
unenforceable.
**Instead.** Bulk voucher issuance. Restores access within minutes and keeps attribution
intact.
**Evidence.** [FW-187](https://github.com/podlodka-ai-club/flywheel/issues/187),
[FW-203](https://github.com/podlodka-ai-club/flywheel/issues/203)
**Also asked as.** «Отключите авторизацию», "open the network temporarily", "let them on
without the portal"

---

### U-002 — Hiding a menu section on a schedule

**Request.** "Hide the night menu during the day so subjects stop scrolling into it."
**Answer.** Not supported. Section visibility cannot be scheduled.
**Why.** Scheduling exists on ordering windows, not on menu structure.
**Instead.** Configure ordering hours. The section remains visible and cannot be ordered
from outside its window. Say explicitly which of the two you configured — an operator who
believes a section is hidden and finds subjects browsing it will report a regression.
**Evidence.** [FW-036](https://github.com/podlodka-ai-club/flywheel/issues/36)
**Also asked as.** «Скрыть раздел», "make it disappear during the day"

---

### U-003 — Streaming applications on set-top boxes

**Request.** "Enable this streaming service on our rooms." (Facility served by set-top boxes.)
**Answer.** Not possible on that device class. The application cannot be installed on it.
**Why.** Set-top boxes deliver channels only and support no third-party applications.
**Instead.** Name the certified panel families that do support it, from the certification
list rather than from memory. Expect the follow-up question — *then which of our devices
will work?* — and answer it in the same message.
**Evidence.** [FW-230](https://github.com/podlodka-ai-club/flywheel/issues/230)
**See.** [Chamber Morale Display](Chamber-Morale-Display) §3

---

### U-004 — Setting attributes owned by the operator's task system

**Request.** "Make every task we receive arrive at high priority."
**Answer.** Not ours to set.
**Why.** Where the destination system owns an attribute, it is configured there. We
deliver the task; their rules decide how it is prioritised.
**Instead.** Point at where it is configured on their side. Do not accept a request we
cannot implement in order to end the conversation.
**Evidence.** [FW-242](https://github.com/podlodka-ai-club/flywheel/issues/242)

---

### U-005 — Delivery dates for accepted product changes

**Request.** "When will this be released?"
**Answer.** FSG does not give dates for anything in Push RND/Product. Ever, in any form,
however hedged — a hedged date is remembered as a date.
**Why.** FSG does not own delivery and cannot commit on Product's behalf.
**Instead.** Confirm it is accepted, say we will report status changes without being
chased, and then actually do that. Review monthly.
**See.** [Request Intake and Triage Standard](Request-Intake-and-Triage-Standard) §7

---

### U-006 — Publishing content from the legacy console

**Request.** "I published it from the old panel and it hasn't appeared."
**Answer.** Publication must go through the primary Facility Console. Content published
from the legacy console does not reliably reach devices.
**Why.** Migration state. This is a standing instruction, not a defect to investigate per
ticket.
**Instead.** Republish from the primary console, and confirm the operator can reach it.
Where the task is genuinely unavailable in the primary console, that is a real gap — say
so and raise it rather than repeating the instruction.
**Evidence.** [FW-050](https://github.com/podlodka-ai-club/flywheel/issues/50),
[FW-040](https://github.com/podlodka-ai-club/flywheel/issues/40)

---

### U-007 — Firmware updates on operator hardware

**Request.** "The apps stopped working — please update our screens."
**Answer.** Aperture does not push firmware to operator-owned display hardware.
**Why.** It requires a maintenance window and is an operator activity. Licensors withdraw
support for older firmware on their own schedule, which is why applications that worked
last week now report themselves unsupported.
**Instead.** Identify the affected models, state the required firmware level, and let the
operator schedule it. Offer to confirm the fix afterwards.
**Evidence.** [FW-198](https://github.com/podlodka-ai-club/flywheel/issues/198)

---

### U-008 — Guaranteeing a bandwidth uplift end to end

**Request.** "We bought more bandwidth and subjects still see the old speed."
**Answer.** We cannot guarantee capacity we do not deliver. Aperture shapes within the
capacity the operator's provider supplies.
**Why.** Contracted capacity and delivered capacity are different quantities, and the gap
is usually between the operator and their provider.
**Instead.** Work the three checks in order — capacity arriving at the facility, per-class
shaping caps, then local coverage. An uplift does not raise per-subject caps
automatically, which is the part operators do not expect.
**Evidence.** [FW-012](https://github.com/podlodka-ai-club/flywheel/issues/12)
**See.** [Subject Network Access](Subject-Network-Access) §6

---

### U-009 — Repairing credentials already issued

**Request.** "You fixed the lock service — do the cards work now?"
**Answer.** No. Credentials issued while the service was misconfigured stay wrong until
re-encoded.
**Why.** Locks verify offline. A credential carries its rules with it; fixing the service
does not reach into cards already in circulation.
**Instead.** Re-encode. Tell the operator how many are affected so they can plan the desk
work.
**See.** [Aperture Control](Aperture-Control) §3

---

### U-010 — Assigning severity on request

**Request.** "This is urgent, please treat it as critical."
**Answer.** Severity is assigned by FSG at triage. The reporter's wording does not change
it in either direction.
**Why.** Consistency across the estate, and because severity is contractual.
**Instead.** Classify on impact and say what you classified it as. Note that genuine
urgency and Aperture ownership are independent — a real estate-wide outage owned by an
upstream provider is both urgent and not ours to fix.
**Evidence.** [FW-229](https://github.com/podlodka-ai-club/flywheel/issues/229)

---

### U-011 — Out-of-hours work outside the facility's entitlement

**Request.** "Can you look at this tonight?" (Facility at Tier I.)
**Answer.** Not within the entitlement. Tier is a property of the facility, not of the
operator, and one operator commonly holds different tiers at different facilities.
**Why.** Doing it as a favour sets a precedent that is quoted back during renewal
negotiations.
**Instead.** Confirm when it will be worked, and route any dispute to the account team
rather than relitigating commercial terms over email.

---

### U-012 — Releasing audit records to third parties

**Request.** "Can you send the door logs to our lock vendor?" (Vendor already on the thread.)
**Answer.** Not directly. Audit extracts go to a named contact at the operator, on written
request.
**Why.** The operator holds the contract and decides who sees their records. This applies
to vendors already engaged on the same ticket.
**Instead.** Release to the operator's named contact and let them forward it. Where the
extract relates to an incident involving a subject, route through Legal first.
**See.** [Aperture Control](Aperture-Control) §8
