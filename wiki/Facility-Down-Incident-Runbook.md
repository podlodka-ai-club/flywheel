<!-- meta
id: fsg-runbook
type: process
audience: triage
tags: [incident, p1, outage, vpn, restart, diagnostics, storm, comms]
-->

# Facility-Down Incident Runbook

**Owner:** Facility Support Group — On-call
**Applies to:** any P1 under [Support Tiers, Severity and Escalation](Support-Tiers-Severity-and-Escalation) §3
**Print this.** The most common time to need this page is when you cannot reach the wiki.

---

## 1. When this runbook applies

Use it when an entire Enrichment Facility, or an entire subsystem across a facility, is
unavailable. Do not use it for a single chamber, a single channel, or a single
integration field — those are P3 and belong in the normal queue.

Before anything else, answer one question: **are subjects currently in chambers, and can
the chambers be opened?** If the answer is no or unknown, page the on-call Facility
Liaison now. Diagnosis continues in parallel, not first.

---

## 2. First ten minutes

Work these in order. Do not skip ahead because the operator has already told you what is
wrong; operators report the symptom they can see, which is usually two layers above the
fault.

### 2.1 Establish scope

Ask, and record the answers in the ticket:

- Every chamber, or a subset? If a subset, which floors or wings?
- Chamber Morale Displays only, or Subject Network Access as well?
- Does the platform home screen render, or is the display entirely dark?
- Has anything changed at the facility in the last 48 hours — server restart, power
  event, network work, firmware push, building maintenance?

The home-screen question is the highest-value one on the list and is routinely skipped.
A rendering home screen with no channels means the platform is alive and the fault is
downstream in the application or the stream source. A dark display means the device is
not talking to the facility server at all. These lead to completely different branches
and confusing them costs about forty minutes.

[FW-032](https://github.com/podlodka-ai-club/flywheel/issues/32) is the case to know:
whole-site failure of *both* the IPTV path and the coaxial fallback, with the home screen
rendering normally throughout. The simultaneous loss of a primary and its independent
fallback is a strong signal for a shared upstream — power, edge network, or licensing —
rather than for two coincident faults.

### 2.2 Confirm the platform from our side

Check the facility's server from Aperture infrastructure before touching anything at the
facility. In a meaningful fraction of reported outages the platform is entirely healthy
and the fault is in the operator's own access path.

[FW-200](https://github.com/podlodka-ai-club/flywheel/issues/200) closed on exactly this:
reported as "the interface will not start after a server restart", confirmed healthy from
our side, and resolved when the operator retried and found it had simply been slow to
load. Always state plainly that you have verified the platform is up. It reframes the
conversation and it is frequently the whole answer.

### 2.3 Establish a working access path

You need to reach the facility server. In order of preference:

1. **Site VPN tunnel** — our standard path.
2. **Operator-provided remote desktop** to a machine inside the facility network.
3. **Operator's own hands**, guided step by step over the phone.

Never wait on option 1 when option 2 is available and staff are standing by. See §3.

---

## 3. VPN tunnel does not come up

The single most common blocker on a facility-down call, and the one with the most
misleading symptom. Roughly one ticket in fifteen across our history involves the tunnel
rather than the platform.

### The trap

The operator reports the VPN service as running. It genuinely is running. The service
unit reports `active (exited)` with the main process having terminated `status=0/SUCCESS`,
which reads as success to anyone who has not seen it before — and to some who have.

`active (exited)` means the unit ran to completion and left nothing behind. For a tunnel
daemon that is a **failure**, not a success. The authoritative check is the interface
list, not the service state:

- Tunnel interface present alongside the LAN interface → tunnel is up, look elsewhere.
- Only the private LAN interface, no tunnel device → the tunnel never established,
  regardless of what the service reports.

[FW-250](https://github.com/podlodka-ai-club/flywheel/issues/250) is the reference case.
The operator restarted the service repeatedly with no effect, because restarting a unit
that exits cleanly reproduces the same clean exit each time.

### Working the tunnel

1. Get the interface listing, not the service status. Ask for it explicitly; "the VPN is
   running" is not an answer to this question.
2. Confirm the facility's public egress address matches what our concentrator expects. A
   changed operator ISP or a replaced edge router will silently break this — the
   configuration is still valid, it is simply no longer authorised from that address.
3. Confirm the operator's firewall permits outbound to our concentrator. Building IT
   changes are a frequent and rarely-volunteered cause.
4. Request the tunnel configuration file currently in use. Not the one they were sent —
   the one in use. These diverge.
5. **In parallel**, take the remote-desktop path. Handle credentials per the security
   policy: accept the identifier in a separate message from the credential, use it only
   for the duration of the incident, and record in the ticket that you did.

Do not let the tunnel become the incident. The tunnel is how we reach the fault; it is
not usually the fault.

---

## 4. Displays not registering with the facility server

When displays are dark or stuck on the welcome state estate-wide:

1. **Confirm the server is serving.** If the platform is down, stop here and go to §5.
2. **Pull on-device diagnostics.** From the main menu on an affected display, enter
   **`1169`**. This opens the device diagnostic log. Have facility staff photograph the
   screen — device logs are frequently the only evidence available, since the affected
   device is by definition not reporting to us.
3. **Check one working display against one broken one.** If any display works, the server
   is fine and the fault is in the path to the broken devices: switch port, VLAN, address
   assignment, or the device itself.
4. **Check the address pool.** Estate-wide registration failure after a network change is
   very often address exhaustion or a scope that no longer covers the chamber VLAN.
5. **Check licensing.** Devices beyond the licensed count will not register. Confirm the
   active licence count against the number of devices actually installed — and note that
   display licences and Subject Device Mirroring licences are counted separately and are
   independently exhaustible. See the
   [Integration Boundary Handbook](Integration-Boundary-Handbook) §7.

---

## 5. Service restart ladder

Restart in this order, confirming recovery between each step. Never begin at the bottom
because it is faster; a facility server restart during occupied hours is itself a
subject-visible event and must be announced to the operator first.

| Step | Action | Subject impact | Announce first |
|---|---|---|---|
| 1 | Restart the affected application service only | None if isolated | No |
| 2 | Restart the streaming service | Channels drop ~30 s | Yes |
| 3 | Restart the device-mirroring service | Active sessions lost | Yes |
| 4 | Restart the platform stack | Full display outage 2–5 min | Yes, in writing |
| 5 | Restart the facility server | Full outage 5–15 min | Yes, in writing, with operator's explicit go-ahead |

Steps 4 and 5 require the operator's explicit written agreement in the ticket. "Go ahead"
in a chat window is sufficient; a verbal agreement recorded by you in the ticket is not.

---

## 6. Power and weather events

Facilities report a characteristic cluster of faults after storms and supply
interruptions. Treat any multi-symptom failure following a weather event as a hardware
survey rather than a software incident — see
[FW-226](https://github.com/podlodka-ai-club/flywheel/issues/226).

Survey, in order: edge router, network switching, media distribution equipment, then
individual displays. Surges propagate along the signal path, so damage tends to be
contiguous and the boundary of the damage tells you where the surge entered.

Displays that are dark, cycling, or showing corrupted output after a supply event are
presumed hardware-failed until proven otherwise. Do not spend the incident window
reflashing them. Establish the count, tell the operator plainly that it is a replacement
conversation, and hand it to the account team.

---

## 7. Communications during a P1

| Time | Message |
|---|---|
| T+15 min | Acknowledgement. What we know, what we are checking, when we will next write. |
| Hourly | Status, even when nothing has changed. Say so explicitly. |
| On workaround | What subjects can do meanwhile. Vouchers, telephone requisitions, manual credentialing. |
| On resolution | What failed, what was done, what will stop it recurring. |

Write the hourly update even when there is nothing to report. Silence during a P1 is
read by operators as absence, and the resulting "any update on this?" messages consume
more of the incident than the updates would have.

Never speculate about root cause in an active P1. Anything written during the incident
will be quoted back during the review, and an early wrong theory is remembered longer
than the correct one that followed it.

---

## 8. After the incident

Within two business days of resolving any P1:

1. Write the resolution in the ticket in plain language, including the actual cause. "It
   is working now" is not a resolution and will be rejected at review.
2. Ask whether this defect exists at other facilities. If it plausibly does, raise it
   under the fleet-wide defect rule in the
   [Request Intake and Triage Standard](Request-Intake-and-Triage-Standard) §7.
3. File Form 41-B if the subject-safety modifier was ever applied.
4. Confirm the workaround has been withdrawn. Vouchers issued during a network outage
   remain valid until revoked, and have been found still working months later.
