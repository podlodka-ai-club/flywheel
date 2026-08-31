<!-- meta
id: fsg-product-con
type: product
audience: triage
tags: [console, admin, account, role, permission, licence, template, preview]
-->

# Product: Facility Console

**Owner:** Enrichment Systems Division — Operator Tools
**Support share:** 10% of all tickets
**Related:** [Content Publishing and Change Control](Content-Publishing-and-Change-Control),
[Request Intake and Triage Standard](Request-Intake-and-Triage-Standard)

---

## Triage quick reference

| ID | Symptom | First check | Owner | Sev |
|---|---|---|---|---|
| T-CON-01 | Visible in one console, absent in the other | **Ask which console.** Migration, not a defect — X-010 | — | P4 |
| T-CON-02 | Password reset link does not work | Token, expiry, or link rewriting by their mail security | Aperture | P3 |
| T-CON-03 | Interface hangs after credentials accepted | Post-authentication load. Do not spend the ticket on the password | Aperture | P3 |
| T-CON-04 | Access worked yesterday, not today | Reachability before account state — try another connection | Operator network | P3 |
| T-CON-05 | Cannot grant a colleague access to a second facility | Expected. The account is estate-level; FSG performs the grant | Aperture | P4 |
| T-CON-06 | A control is missing | Check the reporter's role first — X-009 | — | P4 |
| T-CON-07 | Purchased licences not reflected | Provisioning is manual. Apply it; do not refer to the account team | Aperture | P3 |
| T-CON-08 | Message templates erroring | Templates are shared — confirm scope, likely estate-wide | Aperture | P2 |
| T-CON-09 | Published from the legacy console, nothing appeared | U-006. Republish from the primary console | — | P3 |

---

## 1. What it is

The Facility Console is the operator's interface to everything Aperture runs at their
facilities: content, menus, subject network settings, credentials, licensing, reporting,
and the accounts of the staff who use it.

It is the only product in the estate with no subject-facing surface at all, which makes it
easy to under-prioritise. Resist that. A console fault does not affect subjects directly;
it removes the operator's ability to affect subjects, which is worse, because it converts
every routine change they could have made themselves into a ticket for us.

Several faults filed against other products are console faults in disguise. Voucher codes
vanishing from the console
([FW-233](https://github.com/podlodka-ai-club/flywheel/issues/233)) is reported as a
network problem and is not one; content failing to reach displays
([FW-050](https://github.com/podlodka-ai-club/flywheel/issues/50)) is reported as a display
problem and is usually not one either.

---

## 2. The two-console problem

**Read this section before working any console ticket.**

The estate is mid-migration between a legacy console and its replacement. Both are live,
both are reachable, and operators use whichever they were trained on. This single fact
generates more confusion than any defect in either.

What actually goes wrong:

- **Capability is not identical.** Functions available in the legacy console are missing
  from the replacement, and operators depend on them —
  [FW-040](https://github.com/podlodka-ai-club/flywheel/issues/40) is an operator who lost
  legacy access and named specific work they could no longer do. "Use the new console" is
  not a complete answer to someone whose task is not possible there.
- **Visibility differs by origin.** In the legacy console a user may see only the records
  they themselves created, while the replacement shows the full set. An operator
  reasonably concludes data has been lost
  ([FW-201](https://github.com/podlodka-ai-club/flywheel/issues/201)).
- **Publishing behaves differently.** Content published from the legacy console does not
  reliably reach devices. Publication must go through the primary console — this is a
  standing instruction, not a diagnosis to be repeated per ticket.

When an operator reports something present in one console and absent in the other, that is
the migration and not a defect. Say which console is authoritative for the task in hand,
and confirm they can reach it before closing.

---

## 3. Accounts and access

Console identity is per person and spans an operator's whole estate. A single account
carries access to one or more facilities, with a role at each.

This model is correct and is consistently surprising. Its most visible consequence:
**an operator administrator cannot grant a colleague access to a second facility if that
colleague already has access to a first.** The account exists at the operator level, so
adding a facility to it is a change to an object the requester does not administer, and
the control is simply not offered ([FW-224](https://github.com/podlodka-ai-club/flywheel/issues/224)).

There is nothing wrong when this is reported. FSG performs the grant. Do not send the
operator away to try again.

Roles gate controls by hiding them rather than disabling them. A user without a permission
sees no control at all, and reports the function as missing rather than as forbidden —
[FW-195](https://github.com/podlodka-ai-club/flywheel/issues/195) is this exactly, filed
against requisitions. **Check the reporter's role before investigating any "the button is
not there" report.** It is the fastest disproof available and it is right more often than
not.

---

## 4. Authentication faults

Console sign-in failures are high-urgency by consequence rather than by nature: an operator
who cannot sign in cannot do anything, and everything they would have done becomes ours.

Three recurring shapes, each pointing somewhere different:

| Report | Points at |
|---|---|
| Reset link arrives but does not work ([FW-003](https://github.com/podlodka-ai-club/flywheel/issues/3)) | Token generation, expiry, or link rewriting by the recipient's mail security |
| Credentials accepted, then the interface hangs ([FW-008](https://github.com/podlodka-ai-club/flywheel/issues/8)) | Post-authentication session or entitlement load, not the credentials |
| Access worked yesterday, not today ([FW-184](https://github.com/podlodka-ai-club/flywheel/issues/184)) | Account state change, or the operator's own network |

The second is the one most often misread. Authentication succeeded; what failed came
after it. Do not spend the ticket on the password.

For the third, establish reachability before account state. Console access lost from one
location while working from another is the operator's network, and asking them to try from
a different connection settles it in a minute — a step that resolved
[FW-050](https://github.com/podlodka-ai-club/flywheel/issues/50) after the account itself
had been checked and found healthy.

---

## 5. What operators manage here

| Area | Notes |
|---|---|
| Content and menus | See [Content Publishing and Change Control](Content-Publishing-and-Change-Control) |
| Subject network settings | Authentication methods, voucher issuance |
| Credentials | Issuance and revocation; see [Aperture Control](Aperture-Control) |
| Licensing | Entitlement counts, per pool |
| Communications | Subject-facing message templates |
| Reporting | Requisition history and service statistics |
| Accounts | Users, roles, per-facility access |

### Licensing

The console shows entitlement counts. These are provisioned from commercial records and
**can lag a purchase**, because provisioning is a manual step. An operator seeing a
purchased increase that has not taken effect is describing a real gap, and the remedy is
to apply it rather than to refer them to their account manager
([FW-204](https://github.com/podlodka-ai-club/flywheel/issues/204)).

Always name the pool when quoting a number. Display and mirroring entitlements are counted
separately, and an unqualified figure has caused days of confusion.

### Communications

Subject-facing message templates are authored here. Template faults have unusually wide
blast radius: templates are shared, so a fault in the template store affects every facility
that uses them at once, not one
([FW-029](https://github.com/podlodka-ai-club/flywheel/issues/29)). Treat any template
report as potentially estate-wide and confirm scope before assigning severity.

### Asset requirements

The console accepts assets for content, and it does not always state its requirements
before rejecting or degrading them — an operator changing an image with no guidance on
what was expected is a documented complaint
([FW-040](https://github.com/podlodka-ai-club/flywheel/issues/40)). Media specifications
are in
[Content Publishing and Change Control](Content-Publishing-and-Change-Control) §5. Send
them proactively with any content-change acknowledgement; it prevents the second ticket.

---

## 6. Preview

The console renders subject-facing content as it will appear, through a preview service
that runs outside the facility.

Because it runs outside, it originates from Aperture addresses, which the operator's
network may need to permit. Operators ask for the current address list routinely
([FW-202](https://github.com/podlodka-ai-club/flywheel/issues/202),
[FW-220](https://github.com/podlodka-ai-club/flywheel/issues/220)) and the handling rules
are in the [Integration Boundary Handbook](Integration-Boundary-Handbook) §5 — send the
published list, never an address observed in a log, and record who now holds it.

**Preview reflects published state, not device state.** It will happily show a change that
no display in the facility has yet received, which makes it useless as verification. Never
close a content ticket on the strength of it; see
[Content Publishing and Change Control](Content-Publishing-and-Change-Control) §11.
