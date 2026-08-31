<!-- meta
id: fsg-product-req
type: product
audience: triage
tags: [order, requisition, menu, pos, kitchen, payment, staff, notification]
-->

# Product: Requisition Service

**Owner:** Enrichment Systems Division — Subject Services
**Support share:** 12% of all tickets
**Related:** [Integration Boundary Handbook](Integration-Boundary-Handbook),
[Content Publishing and Change Control](Content-Publishing-and-Change-Control)

---

## Triage quick reference

| ID | Symptom | First check | Owner | Sev |
|---|---|---|---|---|
| T-REQ-01 | Overdue notices continue after staff handled it | Acknowledgement is not completion — state-model mismatch | Aperture | P3 |
| T-REQ-02 | Completion control not visible | Permission-gated, not missing — X-009 | — | P4 |
| T-REQ-03 | Paid requisition stranded in New | Transition on written request; record who asked | Aperture | P3 |
| T-REQ-04 | Timeout submitting to the kitchen terminal | Their side. Supply timestamps for their vendor | Third party | P3 |
| T-REQ-05 | New menu item not orderable | Catalogue synchronisation — scheduled or manual? | Aperture / Operator | P3 |
| T-REQ-06 | Totals differ between display and app | Billing defect. Verify both surfaces before closing | Aperture | P2 |
| T-REQ-07 | A payment exists with no requisition | **E-003 financial escalation** — subject charged, nobody preparing | Aperture | P1 |
| T-REQ-08 | Charge-to-chamber refused for some subjects | The records system's credit flag, not our config | Third party | P3 |
| T-REQ-09 | Subject notes truncated on the docket | **E-004 safety escalation** — dietary restrictions live there | Either | P2 |
| T-REQ-10 | Staff receive requisitions outside their services | Notification scope per user | Aperture | P3 |
| T-REQ-11 | No new requisitions without a manual refresh | Push is the product — core function failure | Aperture | P2 |
| T-REQ-12 | Requisitions arrive without their alert tone | Functional, not cosmetic. Kitchens do not see silent arrivals | Aperture | P3 |
| T-REQ-13 | Tasks reach the operator's tracker late | Sustained latency is an outage — X-001 | Aperture | P2 |
| T-REQ-14 | Consumption not posting to subject accounts | **E-005.** Investigate the whole period, not the noticed cases | Aperture | P2 |

---

## 1. What it is

The Requisition Service lets a subject request something — nutrition, an item, a service —
from the Chamber Morale Display or the companion application, and delivers that request to
whoever must act on it.

Its architecture is a chain of handoffs, and almost every fault in this product is a
handoff that did not complete rather than a component that broke. Establish which handoff
failed before anything else; the answer determines both the fix and the owner.

```
  Subject      Requisition     Aperture      Kitchen terminal    Staff
  places  ───▶ validated  ───▶ routed   ───▶  or task queue  ───▶ completes
   (CMD)        (pricing,        (by                              (companion
                 hours)         service)                             app)
                    │               │               │                  │
              wrong total     never routed     never arrives    never notified
```

---

## 2. Requisition lifecycle

| State | Meaning | Set by |
|---|---|---|
| New | Accepted, not yet acknowledged | Platform |
| Acknowledged | Staff have seen it | Staff |
| In progress | Being fulfilled | Staff |
| Completed | Delivered | Staff |
| Cancelled | Withdrawn | Subject or staff |
| Overdue | Past its delivery window, not completed | Platform |

**Overdue is a derived state, not a stage.** It is computed from the delivery window and
cleared by completion, and this distinction is the source of a recurring complaint: staff
acknowledge a requisition, consider it handled, and continue to receive overdue
notifications because acknowledgement is not completion
([FW-016](https://github.com/podlodka-ai-club/flywheel/issues/16)).

Operators read that as a notification defect. It is a state-model mismatch, and the honest
answer is that our model requires an explicit completion which their workflow does not
naturally produce.

Stranded requisitions are common enough to need a standard remedy: a requisition placed,
paid, and never actioned sits in New indefinitely and continues to generate notifications
([FW-207](https://github.com/podlodka-ai-club/flywheel/issues/207)). FSG may transition it
on the operator's written request. Record who asked.

Before doing that, check whether the operator *can* complete it themselves. The completion
control is permission-gated, and a user without the permission sees no button rather than
a disabled one — they will report that the function is missing, not that they lack access
([FW-195](https://github.com/podlodka-ai-club/flywheel/issues/195)). Check the role before
touching the requisition.

---

## 3. Menus and availability

Menus are content and are published through the Facility Console like any other content.
See [Content Publishing and Change Control](Content-Publishing-and-Change-Control).

Two product constraints belong here rather than there:

**Ordering windows are enforced; section visibility is not schedulable.** The platform can
restrict the hours during which a menu may be ordered from. It cannot hide a section on a
schedule. Operators ask for the second while describing the first
([FW-036](https://github.com/podlodka-ai-club/flywheel/issues/36)). State plainly which
you have configured.

**Windows crossing midnight are entered wrongly more often than not.** A service running
from mid-morning to the small hours spans two calendar days
([FW-197](https://github.com/podlodka-ai-club/flywheel/issues/197)). Confirm the intended
end time explicitly whenever it is earlier in the day than the start.

**Catalogue additions require synchronisation.** An item created at the kitchen terminal
does not become orderable until the catalogue syncs. Operators add an item, fail to find
it, and report it missing ([FW-227](https://github.com/podlodka-ai-club/flywheel/issues/227)).
Confirm whether synchronisation is scheduled or manual at that facility before
investigating anything else.

---

## 4. Pricing and payment

Supported settlement methods are charge-to-chamber, card, and cash. Availability is
per-facility and can additionally be constrained per subject by the records system.

**Charge-to-chamber respects the records system's credit flag.** A subject whose account
is flagged as not permitting charges cannot settle that way. This constraint is enforced
by us on the records system's data, which means the behaviour can change without any
change on our side — and operators experience that as a regression, since requisitions
that previously completed now fail ([FW-217](https://github.com/podlodka-ai-club/flywheel/issues/217)).
When a settlement method stops working for particular subjects and not others, check the
flag before the configuration.

**Pricing must agree across surfaces.** A subject shown one total on the display and
another in the application will raise it, and the operator will treat it as a billing
defect — correctly. In
[FW-245](https://github.com/podlodka-ai-club/flywheel/issues/245) an item modifier priced
correctly from the display was carried into the requisition at zero from the application,
so the two surfaces produced different totals for an identical basket. Any change touching
price, modifiers, or availability is verified on **both** surfaces before closure.

**Online settlement must reconcile to exactly one requisition.** The failure to avoid is
divergence between payment and requisition: in
[FW-088](https://github.com/podlodka-ai-club/flywheel/issues/88) two payment links were
generated, the first failed and cancelled its requisition, the second was paid — and left
a completed payment with no requisition attached to it. Treat any report of a payment
without a matching requisition as a financial-integrity issue and escalate it; the subject
has been charged for something nobody is preparing.

---

## 5. Delivery to the kitchen terminal

Requisitions are submitted to the facility's kitchen terminals, which Aperture does not
own. See the [Integration Boundary Handbook](Integration-Boundary-Handbook) §8.

**Submission timeouts** — a terminal that accepts a connection and then does not respond
produces a timeout at our side, in
[FW-227](https://github.com/podlodka-ai-club/flywheel/issues/227) a thirty-second limit
expiring with no data received. Our side is behaving correctly. Supply the timestamps so
the operator's vendor can locate the matching inbound attempts.

**Printout fields** — requisitions carry the chamber number and the subject's free-text
note, and both must reach the printed docket. Truncation of the note is **a safety defect,
not a formatting one**: subjects record dietary restrictions there, and a partial note
means the kitchen acts on partial information
([FW-248](https://github.com/podlodka-ai-club/flywheel/issues/248)). Escalate on those
grounds regardless of which side of the boundary owns the truncation.

---

## 6. Staff handling

Facility staff work requisitions in the Technician Companion App.

**Notification scope is per user and per service.** A staff member configured for one set
of services must not receive requisitions for another; where they do, they lose confidence
in the routing and begin monitoring everything
([FW-038](https://github.com/podlodka-ai-club/flywheel/issues/38)).

**Push delivery is the product.** An application that only shows new requisitions after a
manual refresh has failed at its core function, because staff are not looking at it —
they are waiting to be told. [FW-033](https://github.com/podlodka-ai-club/flywheel/issues/33)
reports this alongside an unresponsive cancellation control, and the missing push is by
far the more serious of the two.

**Audible alerting is functional, not cosmetic.** Requisitions arriving without their
alert tone are not observed in a working kitchen
([FW-237](https://github.com/podlodka-ai-club/flywheel/issues/237)). Triage silent
notifications as a delivery defect.

---

## 7. Routing to third-party task systems

Some facilities route requisitions into their own task-management system instead of, or
alongside, the companion app.

**Latency is visible and is measured by the operator.** In
[FW-150](https://github.com/podlodka-ai-club/flywheel/issues/150) a requisition placed at
14:26 reached the operator's task tracker at 15:20 — a gap of nearly an hour, noticed
immediately, and traced to congestion on our side rather than theirs. Routing delay is
indistinguishable from routing failure to the person waiting, so treat sustained latency
as an outage.

**Attributes are not always ours to set.** Operators ask for platform-side control of
fields the destination system owns — in
[FW-242](https://github.com/podlodka-ai-club/flywheel/issues/242), for every routed task
to arrive at a fixed priority. Where the destination owns the attribute, say so and point
at where it is configured, rather than accepting a request we cannot implement.

---

## 8. Charge posting to the records system

Consumption recorded at the display — minibar being the common case — posts to the
subject's account in the records system.

Failures here are financial and are discovered late, usually at departure when the subject
disputes a bill that does not include what they consumed, or is asked for one that never
posted. [FW-021](https://github.com/podlodka-ai-club/flywheel/issues/21) is the reference:
housekeeping entered consumption at the display across several chambers and none of it
reached the account.

Posting failures are silent by construction — nothing in the subject's experience reveals
them — so they are found by reconciliation or not at all. Any report of missing postings
is investigated across the whole period, not only the chambers the operator happened to
notice.

---

## 9. Reporting

Operators regularly ask where to see what subjects have requested
([FW-222](https://github.com/podlodka-ai-club/flywheel/issues/222)). Requisition history
and service statistics are available in the Facility Console.

Answer these with the navigation path, not a description. A question about where something
lives is answered by saying where it lives.
