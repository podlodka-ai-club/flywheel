# Product: Aperture Control

**Owner:** Enrichment Systems Division — Access Systems
**Support share:** 4% of all tickets, and the highest severity per ticket of any product
**Related:** [Support Tiers, Severity and Escalation](Support-Tiers-Severity-and-Escalation)

---

## 1. What it is

Aperture Control governs chamber apertures: which doors open, for whom, and when. It
issues and revokes the credentials that actuate them, and it holds the record of every
actuation.

It is the product from which the company takes its name, and it is the only one where a
defect can leave a subject unable to leave a chamber. Everything below is written on that
basis.

> **Standing instruction.** Any report in which a subject cannot exit a chamber is P1
> immediately, regardless of technical content, and remains P1 until the operator confirms
> in writing that the chamber has been opened. No engineer may downgrade it. See
> [Support Tiers, Severity and Escalation](Support-Tiers-Severity-and-Escalation) §3.

---

## 2. Credential types

| Credential | Carried on | Issued by | Revoked by |
|---|---|---|---|
| Subject card | Physical card, encoded at arrival | Facility staff via encoder | Expiry, or re-encoding |
| Mobile credential | Subject's own device | Platform, on request from the app | Departure event, or explicit revocation |
| Staff card | Physical card, role-scoped | Facility staff via encoder | Expiry, or re-encoding |
| Programming card | Physical card, no door access | Access Systems | Superseded by re-issue |

**Programming cards are not access credentials.** They carry configuration into a lock
that has no network path of its own — a lock is a battery-powered device that learns its
identity, its clock, and its access rules from a card presented to it during commissioning.
Failure to encode them stops new locks entering service and stops existing locks being
reconfigured, without affecting any door already in service. It is therefore an urgent
*deployment* problem rather than an access incident, and should not be triaged as though
subjects are affected ([FW-231](https://github.com/podlodka-ai-club/flywheel/issues/231)).

---

## 3. The encoding chain

Physical credentials are produced by a chain, and a break anywhere in it presents
identically at the desk: the card comes out blank and the door refuses it.

```
  Facility Console ──▶ Lock service ──▶ Encoder ──▶ Card ──▶ Lock
     (who, which        (rules,          (writes)            (verifies
      chamber,           validity)                            offline)
      how long)
```

Work it from the console end, not the card end. The most common cause is the lock service
being unreachable or misconfigured rather than an encoder or card fault
([FW-090](https://github.com/podlodka-ai-club/flywheel/issues/90)), and replacing cards
first wastes stock and time.

Note the final step: **locks verify offline.** They hold their own rules and clock and do
not consult anything at the moment of presentation. Two consequences that shape every
diagnosis here:

- A credential issued while the service was misconfigured stays wrong until re-encoded.
  Fixing the service does not repair credentials already in circulation.
- A lock whose clock has drifted will reject valid credentials and accept expired ones,
  and will do so with no error visible anywhere except at the door.

---

## 4. Mobile credentials

Mobile credentials remove the encoder from the chain, and introduce two independent
failure points in its place. **Issuance and actuation fail separately, and the
distinction is the whole diagnosis.**

[FW-005](https://github.com/podlodka-ai-club/flywheel/issues/5) demonstrates both at once
in a single report: on one mobile platform the credential could not be obtained at all,
while on the other it was issued successfully and the door did not open. Those are not one
fault with two symptoms. The first is issuance — the app, the platform, the entitlement.
The second is actuation — the credential, the radio, the lock's own rules.

Always establish which occurred before investigating:

> Did the credential appear in the application, yes or no?

If yes, the issuance path works and the fault is at the door. If no, nothing has reached
the door at all and the lock is not involved. Reports rarely make this distinction on
their own, and it costs an afternoon to work the wrong half.

---

## 5. Lock service availability

The lock service mediates between the console, the records system, and the encoders. When
it is unavailable, credentials cannot be issued through **any** path — neither the
management interface nor the records system
([FW-194](https://github.com/podlodka-ai-club/flywheel/issues/194)).

Doors already in service continue to work, because locks verify offline. This is the
saving grace of the architecture and should be said early and plainly to the operator:
existing credentials still open doors; new ones cannot be made. It converts a perceived
building-wide emergency into a queue at the desk, and it is true.

The equivalent failure at the interface layer — the management console itself refusing
authentication or erroring on load
([FW-186](https://github.com/podlodka-ai-club/flywheel/issues/186)) — has the same
practical effect for staff and a different cause. Check whether the service is down or
merely unreachable from where staff are sitting.

---

## 6. Door state configuration

Locks support a held-open state for scheduled public access — meeting rooms during an
event, back-of-house doors during a shift.

This produces the most misdiagnosed report in the product: **a door that will not close is
usually a door that was told not to.** In
[FW-231](https://github.com/podlodka-ai-club/flywheel/issues/231) a door reported as stuck
open turned out to have the leave-open option enabled, which is a configuration and not a
fault.

Check the door's configured state before treating it as hardware. It takes a minute and it
is right often enough to be the first step rather than the last.

The inverse deserves its own note. A held-open schedule that fails to *apply* leaves a door
locked when the operator expects it open, and staff will attempt to force a door that is
behaving exactly as configured. Both directions of this fault are configuration questions
first.

---

## 7. The vendor boundary

Aperture integrates with lock hardware we do not manufacture. Ownership divides as follows,
and the division is not obvious to anyone at the facility:

| Layer | Owner |
|---|---|
| Credential issuance, entitlement, audit | Aperture |
| Lock service and management interface | Vendor, deployed per facility |
| Encoders and cards | Vendor |
| Locks | Vendor |
| Commissioning and battery maintenance | Operator |

The practical difficulty is that facilities frequently do not know this. Staff turnover and
outsourced building IT mean the question arrives as *who supports this at all?* —
[FW-219](https://github.com/podlodka-ai-club/flywheel/issues/219) is a newly-appointed
contractor asking exactly that, having found nobody at the facility who knew.

Answer it properly. Name the vendor, name what they own, name what we own, and say who
holds the support contract if you can establish it. This is a five-minute question that
prevents a fortnight of a subject-safety-critical system having no identified owner, and it
is worth doing well even though it resolves no fault.

---

## 8. Audit

Every actuation, issuance, and revocation is recorded and retained. The audit record is
frequently the only evidence available after the fact, since locks verify offline and hold
no useful state of their own once a credential has been presented.

Audit extracts are released to the operator on written request from a named contact. They
are not released to facility staff on a support thread, to a contractor, or to a vendor —
including a vendor already engaged on the same ticket. If an audit extract is requested in
connection with an incident involving a subject, route it through Legal before releasing
anything.
