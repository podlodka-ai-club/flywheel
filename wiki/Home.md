# Aperture Science — Facility Support Group

Internal documentation for the **Facility Support Group (FSG)**, the team inside the
Enrichment Systems Division responsible for keeping deployed Enrichment Facilities
operational, compliant, and adequately supplied with morale content.

This wiki is the authoritative reference for how FSG works. Where a page here conflicts
with a verbally communicated instruction, this wiki wins. Where it conflicts with a
directive from the Chief Executive Officer, please refer the matter to Legal and continue
working normally in the meantime.

---

## What we support

Aperture licenses the **Aperture Enrichment Platform (AEP)** to Licensed Facility
Operators, who run Enrichment Facilities on our behalf. Each facility contains some
number of test chambers, each containing one or more test subjects, each entitled by
contract to a baseline level of entertainment, network access, nutrition, and door
functionality.

FSG does not operate facilities. FSG keeps the platform running underneath the operators
who do. This distinction is the source of approximately 40% of our ticket volume and the
entire content of the [Integration Boundary Handbook](Integration-Boundary-Handbook).

---

## The five core pages

| Page | Read this when |
|---|---|
| [Support Tiers, Severity and Escalation](Support-Tiers-Severity-and-Escalation) | You need to know how fast something must be fixed and who to wake up |
| [Facility-Down Incident Runbook](Facility-Down-Incident-Runbook) | An entire facility is dark and subjects are in chambers |
| [Integration Boundary Handbook](Integration-Boundary-Handbook) | The fault might belong to someone who is not us |
| [Request Intake and Triage Standard](Request-Intake-and-Triage-Standard) | A request has arrived and needs to become a well-formed ticket |
| [Content Publishing and Change Control](Content-Publishing-and-Change-Control) | An operator wants something different on the chamber displays |

---

## Standing terminology

New FSG staff consistently misuse these terms in customer-facing correspondence, which
creates contractual exposure. Learn them before your first shift.

| Term | Abbrev. | What it is |
|---|---|---|
| Enrichment Facility | — | A deployed site. Referred to externally as Facility A, Facility B, etc. Never by its commercial name in a ticket. |
| Licensed Facility Operator | LFO | The partner organisation that runs a facility. Our contractual counterparty. Files most of our tickets. |
| Test Subject | — | An occupant of a chamber. Not a "guest". Not a "customer". Not, per Legal, a "volunteer". |
| Test Chamber | — | A single subject-occupied unit. Our licensing counts these. |
| Chamber Morale Display | CMD | The in-chamber screen. Delivers channels, facility information, and mandated encouragement. |
| Subject Network Access | SNA | Subject-facing network service, including the authentication portal and access vouchers. |
| Subject Intake & Disposition System | SIDS | The operator's records system. Owns arrivals, chamber assignment, departures, and final disposition. Third-party in almost all deployments. |
| Nutrient Requisition Terminal | NRT | The kitchen-side ordering system that receives requisitions placed from the CMD. |
| Aperture Control | — | Chamber door actuation and credentialing. Includes physical and subject-device credentials. |
| Facility Console | — | The operator's web administration interface. Where content and configuration are authored. |
| Technician Companion App | TCA | Handheld application used by facility staff to receive and close requisitions and tasks. |
| Subject Device Mirroring | SDM | Casting from a subject's own device to the CMD. Separately licensed from the CMD itself. |

---

## Volume and shape of the work

FSG handled **250 tickets** across July and August 2026 — 129 and 121 respectively. This
is our steady state and should be treated as the planning baseline.

Arrival channel:

| Channel | Volume | Share |
|---|---|---|
| Email | 196 | 78% |
| Web form | 48 | 19% |
| Chat | 6 | 2% |

Email dominance is deliberate and is not a problem to be solved. Operators forward
threads that already contain their own internal correspondence, their subcontractors'
correspondence, and occasionally correspondence from a third-party vendor who has already
diagnosed the fault. That context is valuable. Do not push operators toward the web form
in the belief that it produces cleaner tickets. It produces shorter ones.

---

## Escalation, in one line

If subjects are in chambers and a chamber cannot be opened, stop reading this wiki and
page the on-call Facility Liaison immediately. Everything else can wait fifteen minutes.
