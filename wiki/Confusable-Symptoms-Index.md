<!-- meta
id: fsg-confusable
type: decision
audience: triage
tags: [disambiguation, confusable, similar, distinguish, lookalike, ownership]
-->

# Confusable Symptoms Index

**Owner:** Facility Support Group — Service Delivery
**Purpose:** symptom pairs that read almost identically and diverge completely. Each entry
gives the one question that separates them.

---

## How to use this page

These pairs share vocabulary. A report will match both halves, and the wrong half leads to
a different owner, a different severity, or a wasted afternoon.

**Ask the separating question before diagnosing.** Every entry has exactly one, chosen
because it can be answered by the operator immediately and without instrumentation.

---

### X-001 — A downstream system is slow or timing out

| | Their side | Our side |
|---|---|---|
| **Looks like** | Requisitions failing with timeouts | Requisitions arriving late |
| **Actually** | Kitchen terminal accepts the connection, never responds | Our routing congested |
| **Owner** | Operator's vendor | Aperture |
| **Evidence** | [FW-227](https://github.com/podlodka-ai-club/flywheel/issues/227) | [FW-150](https://github.com/podlodka-ai-club/flywheel/issues/150) |

**Separating question.** *Did it arrive at all?*
A timeout means nothing was accepted — supply the timestamps and let their vendor find the
inbound attempt. Late arrival means we accepted it and were slow, which is ours.

Sustained latency is indistinguishable from failure to the person waiting. Treat a
persistent delay as an outage, not as a performance issue.

---

### X-002 — A door is not behaving

| | Will not open | Will not close |
|---|---|---|
| **Severity** | P1 path if a subject is inside | Routine |
| **Likely cause** | Credential, lock rules, or issuance | Held-open state is configured |
| **Evidence** | [FW-005](https://github.com/podlodka-ai-club/flywheel/issues/5) | [FW-231](https://github.com/podlodka-ai-club/flywheel/issues/231) |

**Separating question.** *Is anyone inside?*
Answer unknown counts as yes, and the ticket becomes P1 under E-001.

A door that will not close is usually a door that was told not to. Check the configured
state before treating it as hardware — it takes a minute and it is right often enough to
be the first step.

---

### X-003 — Something is wrong with subject credentials

| | Persist after departure | Rejected at login |
|---|---|---|
| **Means** | Chamber reset did not clear them | Records feed is not current |
| **Class** | Privacy escalation (E-002) | Routine integration fault |
| **Evidence** | [FW-157](https://github.com/podlodka-ai-club/flywheel/issues/157) | [FW-205](https://github.com/podlodka-ai-club/flywheel/issues/205) |

**Separating question.** *Is a subject seeing too much, or too little?*
Too much is a data-protection matter and escalates immediately. Too little is an
integration fault and follows the ordinary path.

The two share almost every keyword — subject, credentials, arrival, departure — and are as
far apart as any pair on this page.

---

### X-004 — Device mirroring reports no capacity

| | Stale sessions | Genuine exhaustion |
|---|---|---|
| **Looks like** | "All devices busy" with nothing connected | "All devices busy" |
| **Check** | Are the targets actually in use? | Licensed count against installed count |
| **Evidence** | [FW-014](https://github.com/podlodka-ai-club/flywheel/issues/14) | [FW-204](https://github.com/podlodka-ai-club/flywheel/issues/204) |

**Separating question.** *Is anything actually connected right now?*
If nothing is, this is stale session state on the mirroring service — check the service,
not the devices, and note that restarting the receivers will not help.

Mirroring and display entitlements are separate pools that exhaust independently. Always
name the pool when quoting a count.

---

### X-005 — Displays are not working across a facility

| | Home screen renders | Screen entirely dark |
|---|---|---|
| **Means** | Platform alive, fault is downstream | Device is not reaching the server |
| **Look at** | Application, stream source, licensing | Network path, address pool, VLAN, device |
| **Evidence** | [FW-032](https://github.com/podlodka-ai-club/flywheel/issues/32) | [FW-236](https://github.com/podlodka-ai-club/flywheel/issues/236) |

**Separating question.** *Does the platform home screen appear?*

This is the highest-value question in the entire index and it is routinely skipped.
Confusing the two branches costs about forty minutes.

Note that a healthy-looking network path does not settle it: a device can have link, a live
switch port, a correct VLAN and a valid address and still not reach the server.

---

### X-006 — Content changed in the console has not appeared

Four distinct causes, one symptom.

| Cause | Test |
|---|---|
| Saved but never published | Does it appear in console preview? |
| Published, device cache not refreshed | Does it appear after a power cycle? |
| Published at the wrong scope level | Does it appear at some chambers but not others? |
| A lower-level override defeats it | Is exactly one chamber wrong? |

**Separating question.** *Does it appear in the console preview?*
No means it was never published — including for deletions, which are a change like any
other and need the same publish step.

**Evidence.** [FW-050](https://github.com/podlodka-ai-club/flywheel/issues/50),
[FW-225](https://github.com/podlodka-ai-club/flywheel/issues/225)

Preview reflects published state, never device state. It is not verification.

---

### X-007 — An application on the display shows an error

| | `app not supported` | `service unavailable` |
|---|---|---|
| **Means** | Licensor withdrew support for this firmware | Our service is down |
| **Owner** | Operator (firmware update) | Aperture |
| **Evidence** | [FW-198](https://github.com/podlodka-ai-club/flywheel/issues/198) | [FW-002](https://github.com/podlodka-ai-club/flywheel/issues/2) |

**Separating question.** *What does the error actually say?*
Ask for the verbatim string or a photograph. Paraphrased errors — "it says it's not
working" — have sent us down the wrong branch more than once.

Third-party application support is certified per model, not per manufacturer.

---

### X-008 — Subjects cannot authenticate to the network

Four causes behind one symptom, and the portal looks healthy in all of them: it loads,
accepts input, and declines it.

| Cause | Distinguishing detail | Evidence |
|---|---|---|
| Feed absent | No subject matches at all | [FW-205](https://github.com/podlodka-ai-club/flywheel/issues/205) |
| Feed delayed | Only recent arrivals affected | [FW-020](https://github.com/podlodka-ai-club/flywheel/issues/20) |
| Subscription withdrawn | Worked, then stopped, repeatedly | [FW-193](https://github.com/podlodka-ai-club/flywheel/issues/193) |
| Authorisation refused | Stale data; chamber moves not propagating | [FW-238](https://github.com/podlodka-ai-club/flywheel/issues/238) |

**Separating question.** *When did the affected subjects arrive?*
Only recent arrivals means propagation delay, which is not the same fault as propagation
failure and is settled in seconds. Everybody, including long-stay subjects, means the feed
is down.

Confirm the feed is live *before* looking at the portal. Reversing that order is the most
common way an incident loses its first hour.

---

### X-009 — A control is missing from the interface

| | Permission-gated | Genuinely absent |
|---|---|---|
| **Means** | The user lacks the role | The capability is in the other console, or does not exist |
| **Evidence** | [FW-195](https://github.com/podlodka-ai-club/flywheel/issues/195) | [FW-040](https://github.com/podlodka-ai-club/flywheel/issues/40) |

**Separating question.** *What is this user's role, and which console are they in?*
Permissions hide controls rather than disabling them, so the user reports the function as
missing rather than as forbidden.

---

### X-010 — Data is visible in one console and not the other

**Not a defect.** The estate is mid-migration and the two consoles differ in what they
show: the legacy console may show only records the user themselves created, while the
replacement shows the full set.

An operator reasonably concludes data has been lost. It has not.
**Evidence.** [FW-201](https://github.com/podlodka-ai-club/flywheel/issues/201)

**Separating question.** *Which console are you looking at?*
Ask it on every console ticket, before anything else.

---

### X-011 — The display shows the wrong subject

| | Departure reset failed | Feed carries the wrong identity |
|---|---|---|
| **Tell** | Previous occupant's name, display also did not power down | Current occupant, wrong details |
| **Evidence** | [FW-013](https://github.com/podlodka-ai-club/flywheel/issues/13) | [FW-181](https://github.com/podlodka-ai-club/flywheel/issues/181) |

**Separating question.** *Is the name shown the previous occupant's, or simply wrong?*
The previous occupant's name is a departure-reset failure and carries a privacy dimension
under E-002. Merely wrong is an identity-data question for the records feed.

---

### X-012 — Bandwidth is below what was purchased

Three causes, checked in this order:

1. Is the contracted capacity actually arriving at the facility? *(Usually the answer.)*
2. Is a per-class shaping cap holding subjects below it? *(Uplifts do not raise per-subject
   caps automatically — the part operators do not expect.)*
3. Is the constraint local coverage rather than capacity at all?

**Separating question.** *Is it slow everywhere, or only in some areas?*
Only in some areas is coverage, and no amount of capacity will fix it.
**Evidence.** [FW-012](https://github.com/podlodka-ai-club/flywheel/issues/12)
