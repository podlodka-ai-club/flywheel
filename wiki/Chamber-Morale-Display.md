# Product: Chamber Morale Display

**Owner:** Enrichment Systems Division — Display Platform
**Support share:** 39% of all tickets, the largest single product in the estate
**Related:** [Content Publishing and Change Control](Content-Publishing-and-Change-Control),
[Facility-Down Incident Runbook](Facility-Down-Incident-Runbook)

---

## 1. What it is

The Chamber Morale Display (CMD) is the screen mounted in every test chamber. It is the
primary channel through which Aperture delivers entertainment, facility information,
requisition menus, and mandated encouragement to subjects in situ.

It is also, by a wide margin, the most visible product we make. A subject who never opens
the companion application and never places a requisition will still look at the CMD, and
a defect on it is observed by every occupant of every affected chamber. Treat display
faults as having a higher effective blast radius than their severity classification
suggests.

---

## 2. Surfaces

The same content model is rendered on three surfaces:

| Surface | Where | Notes |
|---|---|---|
| Chamber display | In chamber, wall-mounted | Primary. Subject interacts by remote. |
| Subject Companion App | Subject's own device, or a chamber tablet | Same content, independent cache |
| Public-area display | Corridors, lobbies, floor lounges | No subject session; information only |

Public-area displays are frequently added late in a deployment and are frequently
forgotten in licensing. A display with a network port can be added to the estate and
receive channels — [FW-144](https://github.com/podlodka-ai-club/flywheel/issues/144) is a
routine request of exactly this kind — but it consumes a licence like any other.

Surface divergence is a defect class of its own. See
[Content Publishing and Change Control](Content-Publishing-and-Change-Control) §8.

---

## 3. Supported device classes

Aperture does not manufacture display hardware. We certify it. Only devices on the
certification list are supported, and the practical consequence of an uncertified device
is not that it fails outright — it is that it works until a platform update, and then
does not.

| Class | Certified families | Notes |
|---|---|---|
| Hospitality panel | Philips HFL series | Broadest app support |
| Hospitality panel | Samsung HG series | Requires hospitality mode configured |
| Hospitality panel | LG hospitality series | See §6 on audio behaviour |
| Set-top box | TVIP | Channel delivery only; no third-party app support |
| Legacy panel | Loewe and similar | Best effort, no new deployments |

Model-level differences matter more than family-level ones. Third-party entertainment
applications in particular are certified per model, not per manufacturer — the fact that
a licensor's application runs on one Philips panel says nothing about whether it runs on
another. Operators ask for per-model guidance regularly
([FW-143](https://github.com/podlodka-ai-club/flywheel/issues/143)) and the answer must
come from the certification list rather than from memory.

Set-top boxes are the trap. They deliver channels perfectly well and support no
third-party applications at all. An operator who has enabled a streaming service on a
test chamber served by a set-top box will see it fail and will reasonably conclude the
service is broken. It is not; it is unavailable on that device class and cannot be
installed on it. [FW-230](https://github.com/podlodka-ai-club/flywheel/issues/230) is the
worked example, including the follow-on question every operator asks next — *then which
of our panels will support it?* — which is answered from the certification list.

---

## 4. Channel delivery

Channels reach the display over the facility network from the facility server. Where a
facility retains legacy coaxial distribution, that path runs in parallel as a fallback.

The two paths are independent, which makes their simultaneous failure diagnostically
significant: it points at something they share — power, the facility server, upstream
delivery, or licensing — rather than at two coincident faults. See
[FW-032](https://github.com/podlodka-ai-club/flywheel/issues/32).

Upstream channel delivery is contracted by the operator, not by Aperture. When an entire
channel group stops broadcasting, our part is to confirm we are receiving and forwarding
it; the fault is very often at the provider.
[FW-229](https://github.com/podlodka-ai-club/flywheel/issues/229) — every
Russian-language channel simultaneously off air — is the shape to recognise. A whole
language group failing at once is upstream until proven otherwise, because nothing in our
delivery path is organised by language.

Channels dropping back to the welcome screen mid-playback
([FW-234](https://github.com/podlodka-ai-club/flywheel/issues/234)) is a distinct fault
from channels not starting. It indicates the stream is being lost after acquisition —
network, upstream continuity, or device buffering — and should be investigated as a
delivery problem rather than a configuration one.

---

## 5. Application shell and third-party entertainment

The application shell is ours. The entertainment applications inside it are the
licensors', and they are subject to the licensor's own device support policy, which
changes without reference to us.

**`app not supported` almost always means firmware.** Licensors withdraw support for
older device firmware on their own schedule, and the resulting error appears on devices
that worked the previous week. The remedy is a firmware update to the panels, which is an
operator activity requiring a maintenance window —
[FW-198](https://github.com/podlodka-ai-club/flywheel/issues/198).

Updates cut the other way too. An estate-wide application fault appearing immediately
after an update — in [FW-011](https://github.com/podlodka-ai-club/flywheel/issues/11), an
operator's own update, after which every panel at the facility developed the same
application problem — is a correlation worth establishing before anything else. It applies
equally to platform updates, firmware updates, and changes the operator made without
telling us, and it is consistently the last thing anyone thinks to ask about.

### Subject credential residue

**This is a privacy defect and is not to be triaged as cosmetic.**

Third-party applications store the credentials of whoever signed in. When a subject
departs, those credentials must be cleared as part of chamber reset. Where reset does not
run, or runs incompletely, the next occupant of that chamber inherits the previous
subject's signed-in session.

[FW-157](https://github.com/podlodka-ai-club/flywheel/issues/157) and
[FW-132](https://github.com/podlodka-ai-club/flywheel/issues/132) are both this, the
latter across a large number of panels with a manual clearing procedure that did not hold.
Any report of credentials, history, or personalisation surviving a departure is escalated
under the data-protection path, not queued as a display bug.

---

## 6. Known device behaviours

Documented so that engineers stop re-diagnosing them.

**Intermittent audio loss on set-top delivery.** Audio drops on channels while video
continues; restored by power-cycling the box or re-seating its network cable. Observed on
LG boxes and historically on Loewe panels
([FW-028](https://github.com/podlodka-ai-club/flywheel/issues/28)). The re-seat being an
effective remedy points at link negotiation rather than at the stream.

**Small video window on first channel selection.** The first channel opened after the
shell loads renders in a reduced window; going back and reselecting renders correctly, and
the second attempt always works. Long-standing, reproducible, and seen at more than one
facility ([FW-010](https://github.com/podlodka-ai-club/flywheel/issues/10)). Because it is
reproducible estate-wide it is a fleet-wide defect and must be raised as one rather than
re-reported per site.

**Unfillable credential prompt after cloning.** A cloned panel can present an eight-digit
password prompt that accepts no input, with the remote unresponsive from the moment the
prompt appears ([FW-034](https://github.com/podlodka-ai-club/flywheel/issues/34)). The
device must be re-provisioned; there is no key sequence that dismisses it.

**Loss of remote management after a platform update.** Panels stop being controllable from
the management interface after certain updates, estate-wide rather than per chamber, and
recurrently ([FW-188](https://github.com/podlodka-ai-club/flywheel/issues/188)). Recurrence
after *every* update is the operator's actual complaint here and is the part that needs
answering.

---

## 7. Subject session lifecycle

The display is session-aware and is driven by arrival and departure events from the
records system. Three transitions, each with a characteristic failure:

| Transition | Expected | Characteristic failure |
|---|---|---|
| Arrival | Display powers on, shows personalised welcome | Does not power on ([FW-060](https://github.com/podlodka-ai-club/flywheel/issues/60)) |
| Occupancy | Correct subject identity throughout | Wrong identity shown ([FW-181](https://github.com/podlodka-ai-club/flywheel/issues/181)) |
| Departure | Display powers down, chamber state reset | Stays on, prior identity persists ([FW-013](https://github.com/podlodka-ai-club/flywheel/issues/13)) |

All three depend on events arriving from the records system, so all three fail together
when that integration is down. Before investigating the display, confirm the events are
arriving at all — see the
[Integration Boundary Handbook](Integration-Boundary-Handbook) §6.

The departure failure is the serious one. A display that does not power down on departure
and continues to show the previous subject's name is simultaneously a power-management
defect, a privacy exposure, and the reason the next subject's arrival appears wrong.

---

## 8. Subject Device Mirroring

Subjects may mirror their own device to the display. Mirroring is separately licensed
from the display itself and the two pools exhaust independently — see the
[Integration Boundary Handbook](Integration-Boundary-Handbook) §7 and
[FW-204](https://github.com/podlodka-ai-club/flywheel/issues/204).

The signature failure is a capacity message when there is no capacity problem: subjects
are told all mirroring targets are busy while nothing is connected to any of them, and
restarting the receiving devices does not help
([FW-014](https://github.com/podlodka-ai-club/flywheel/issues/14)). Read this as stale
session state on the mirroring service rather than as genuine contention, and check the
service before the devices. A plain *service unavailable* on selecting mirroring
([FW-002](https://github.com/podlodka-ai-club/flywheel/issues/2)) is the same service in a
different failure mode.

Mirroring faults have a poor history of resolution time in this estate. See
[FW-025](https://github.com/podlodka-ai-club/flywheel/issues/25), which ran roughly three
months and became a commercial escalation. Apply §9 of
[Support Tiers, Severity and Escalation](Support-Tiers-Severity-and-Escalation) early.

---

## 9. Operational modules on the display

The display is also a staff surface. Housekeeping inspection tasks are issued to chamber
displays so that staff can act on them without returning to a terminal
([FW-192](https://github.com/podlodka-ai-club/flywheel/issues/192)).

When a task appears in the web interface but not on the display, the task exists and the
delivery to the display has failed. Say so in those terms — it is a materially different
statement from "the task was not created", and it tells the operator their records are
intact.

---

## 10. Diagnostics

From the main menu on any display, enter **`1169`** to open the device diagnostic log.
Have facility staff photograph it.

This is the single most useful diagnostic available for display faults, because an
affected device is by definition not reporting to us and the log on the panel is often the
only evidence in existence. Ask for it early rather than as a last resort.
