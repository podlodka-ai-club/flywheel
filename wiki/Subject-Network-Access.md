# Product: Subject Network Access

**Owner:** Enrichment Systems Division — Network Services
**Support share:** 13% of all tickets
**Related:** [Integration Boundary Handbook](Integration-Boundary-Handbook),
[Facility-Down Incident Runbook](Facility-Down-Incident-Runbook)

---

## 1. What it is

Subject Network Access (SNA) provides network connectivity to subjects and to the devices
they bring with them. It comprises the authentication portal, the identity methods behind
it, the entitlement model that decides how much bandwidth a subject receives, and the
gateway that enforces both.

SNA is contractually significant out of proportion to its ticket volume. Subjects
tolerate a broken channel; they do not tolerate being unable to connect, and they raise it
with facility staff immediately rather than waiting. An SNA outage generates complaints
at the facility within minutes, which is why so many SNA tickets arrive already escalated.

---

## 2. Authentication methods

A facility enables one or more. They are independent and can be combined.

| Method | Subject supplies | Depends on | Typical use |
|---|---|---|---|
| Records credentials | Chamber number + surname | Live records-system feed | Default for occupied chambers |
| SMS | Mobile number, receives a code | SMS gateway credentials | Where records data is unreliable |
| Voucher | A pre-issued code | Nothing external | Events, groups, staff, contractors |
| Open | Nothing | Nothing | Not supported — see §7 |

Facilities change this mix over their lifetime, and the change is a configuration request
rather than a fault. [FW-172](https://github.com/podlodka-ai-club/flywheel/issues/172) is
representative: enable SMS using operator-supplied gateway credentials, and simultaneously
withdraw vouchers, leaving records credentials and SMS as the only routes in.

When withdrawing a method, confirm what happens to credentials already issued under it.
Vouchers in circulation do not stop working because the method was disabled for new
issuance, and subjects holding them will continue to connect.

---

## 3. The records-system dependency

Records-credential authentication is only as current as the feed behind it. This single
dependency accounts for most SNA incidents in our history, and it fails in a
characteristic way: **the portal stays up and simply rejects everybody.**

Nothing about the failure looks like a failure. The portal loads, accepts input, and
declines it. Facility staff conclude subjects are entering their details wrongly, and
several hours pass before anyone suspects the integration.

The feed breaks in three ways, and they are worth distinguishing because the remedies
differ:

1. **The subscription is withdrawn.** The records system deactivates event delivery,
   usually because our endpoint was slow or erroring. Re-enabling without fixing our side
   produces another deactivation —
   [FW-193](https://github.com/podlodka-ai-club/flywheel/issues/193), which deactivated
   three times in one day.
2. **Our calls are refused.** The records system rejects us on authorisation grounds,
   commonly because our calling address is no longer on its allowlist —
   [FW-238](https://github.com/podlodka-ai-club/flywheel/issues/238). Chamber moves and
   stay extensions then stop propagating silently.
3. **The feed is simply absent.** No synchronisation at all, so no subject can be matched
   — [FW-205](https://github.com/podlodka-ai-club/flywheel/issues/205) and
   [FW-031](https://github.com/podlodka-ai-club/flywheel/issues/31).

There is also a timing variant worth knowing: a subject who has genuinely arrived but
whose arrival has not yet propagated cannot authenticate, and will be standing at
reception insisting, correctly, that they have checked in
([FW-020](https://github.com/podlodka-ai-club/flywheel/issues/20)). Propagation delay is
not the same fault as propagation failure, and the operator can distinguish them in
seconds by asking when the subject arrived.

**Diagnostic order for any "subjects cannot authenticate" report:** confirm the feed is
live, *then* look at the portal. Reversing this order is the most common way an SNA
incident loses its first hour.

---

## 4. The captive portal

The portal is the first thing a subject interacts with and is branded per facility.

Where several authentication methods are enabled, they are presented as a set of options.
If subjects cannot see that the options exist, the methods might as well not be enabled —
[FW-240](https://github.com/podlodka-ai-club/flywheel/issues/240) reports exactly this
outcome, with subjects routinely telephoning reception to ask how to connect by SMS
because the control revealing the alternatives was not visibly a control.

That ticket is worth reading in full during onboarding. It is a purely cosmetic defect
with an entirely operational cost: every unclear affordance on the portal converts
directly into calls to facility staff, and the operator experiences that as a support
burden we created.

The portal must also present *correct* information. A portal serving stale or wrong
facility content while authentication is failing compounds the incident, because staff
lose confidence that anything on the screen is accurate
([FW-187](https://github.com/podlodka-ai-club/flywheel/issues/187)).

---

## 5. Vouchers

Vouchers are pre-issued codes that authenticate without reference to any external system.
They are the fallback when everything else is unavailable, and their independence is the
entire point.

Standard uses:

- **Events and groups**, where attendees are not registered as chamber occupants. The
  common qualifier is that SMS is unavailable to the group — attendees whose numbers are
  blocked or unreachable cannot receive a code at all
  ([FW-211](https://github.com/podlodka-ai-club/flywheel/issues/211)).
- **Contractors and staff** who require access without a chamber.
- **Incident fallback**, issued during a records-feed outage so subjects can connect while
  the integration is repaired.

Voucher codes are managed from the Facility Console. When they stop being visible there,
the operator loses the ability to issue access at all —
[FW-233](https://github.com/podlodka-ai-club/flywheel/issues/233) — which is a console
fault presenting as a network fault, and should be triaged to the console.

**Withdraw incident vouchers explicitly.** They do not expire because the incident ended.
The post-incident checklist in the
[Facility-Down Incident Runbook](Facility-Down-Incident-Runbook) §8 exists largely for
this.

---

## 6. Bandwidth and entitlement

Subjects receive a bandwidth entitlement by class. Operators purchase a contracted
capacity to the facility, and Aperture shapes within it.

The recurring dispute is between *contracted* capacity and *delivered* capacity. An
operator who has bought an uplift expects subjects to see it, and when they do not, the
question arrives as a fault. [FW-012](https://github.com/podlodka-ai-club/flywheel/issues/12)
is the pattern — a substantial uplift purchased, subject experience unchanged — and the
answer requires checking three things in order:

1. Is the full contracted capacity actually arriving at the facility? This is between the
   operator and their provider, and it is where the answer usually is.
2. Is a per-class or per-subject shaping policy capping subjects below the new figure?
   Uplifts do not raise per-subject caps automatically, and this is the part operators do
   not expect.
3. Is the constraint local — a wireless coverage or contention problem in a specific area
   rather than a capacity problem at all?

Per-port uplifts for individual chambers are a supported request
([FW-180](https://github.com/podlodka-ai-club/flywheel/issues/180)). Note what that
ticket also records: the requester was passed between teams several times before reaching
anyone who could act. Bandwidth requests have no obvious owner at first glance, and the
correct destination is Network Services. Route them there rather than onward.

---

## 7. What SNA does not do

**We do not run open networks.** During an authentication outage operators reasonably ask
us to disable authentication so subjects can connect —
[FW-187](https://github.com/podlodka-ai-club/flywheel/issues/187) asks precisely this, and
[FW-203](https://github.com/podlodka-ai-club/flywheel/issues/203) follows up on a facility
that had historically operated that way.

The answer is no, and the reason is not obstructiveness. An unauthenticated subject
network cannot attribute traffic, which removes the operator's ability to meet their own
legal obligations, and it makes per-subject entitlement unenforceable. The supported
fallback is bulk voucher issuance, which restores access within minutes and keeps
attribution intact.

Offer the voucher path in the same message as the refusal. A refusal without an
alternative is what turns this request into an escalation.
