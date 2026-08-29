<!-- meta
id: fsg-content
type: process
audience: triage
tags: [content, publish, cache, media, playlist, schedule, freeze]
-->

# Content Publishing and Change Control

**Owner:** Facility Support Group — Content Operations
**Applies to:** everything a test subject can see on a Chamber Morale Display or in the
subject application
**Related:** [Request Intake and Triage Standard](Request-Intake-and-Triage-Standard) §6

---

## 1. Scope

Chamber Morale Displays exist to deliver facility information, entertainment, requisition
menus, and mandated encouragement to subjects in chambers. Operators author most of this
themselves in the Facility Console. FSG owns the pipeline that carries it to the display,
and is called whenever the two disagree.

"The operator changed it and the display did not" is one of our most common ticket
shapes. It is almost never a bug. It is almost always a misunderstanding of §2.

---

## 2. The publishing pipeline

Content does not travel from the Facility Console to a chamber display in one step. It
travels in four, and it can stall at any of them.

```
  Facility Console          Publish            Distribution         Device cache
  (author / edit)  ──────▶  (commit)  ──────▶  (to facility) ─────▶  (per display) ─────▶ Display
       │                      │                     │                     │
   saved but              published but         distributed but       cached but
   not published          not distributed       not refreshed         not repainted
```

Each of those four intermediate states looks identical to an operator: they made a
change, and the display shows the old thing. Establishing *which* one you are in is the
entire diagnosis, and asking three questions gets you there:

1. Does the change appear in the Console preview? *(No → it was never published.)*
2. Does it appear on a display that was power-cycled just now? *(Yes → device cache.)*
3. Does it appear in the subject application on a phone? *(Yes → display-side only.)*

### Saved is not published

The most frequent cause by a wide margin. Console edits are saved as drafts and require an
explicit publish. Operators who have edited only one surface before reasonably assume that
saving is sufficient.

### Deletion is a publish

Removing content is a change like any other and needs the same publish step. This produces
the ticket shape that alarms operators most: content deleted in the Console, absent from
the Console preview, and still visible to subjects on the display.

[FW-050](https://github.com/podlodka-ai-club/flywheel/issues/50) is the reference case — a
removed section gone from both the menu and the preview, still rendering on the subject
welcome screen. FSG published it manually to resolve the immediate problem. Note the
sequencing in that thread: the content was fixed first and the underlying question of why
publication had not carried through was investigated afterwards. That is the correct
order for anything subject-visible.

### Multiple consoles

Some facilities have access to more than one administration interface during platform
transitions. Content published from one may not propagate the same way as content
published from the other. **Publication must go through the primary Facility Console.**
Where an operator reports the second interface behaving differently, this is the answer
and it should be given plainly rather than investigated.

---

## 3. Content scope hierarchy

Content is authored at a level and inherits downward. Publishing at the wrong level is the
second most common cause of "it did not appear".

| Level | Applies to | Typical content |
|---|---|---|
| Brand | Every facility of one operator | Corporate video, brand identity, legal notices |
| Facility | One site | Welcome content, channel list, facility services |
| Zone | A wing, floor, or residence group | Zone-specific menus, local information |
| Chamber class | All chambers of one grade | Grade-specific entitlements and offers |
| Chamber | One chamber | Personalised welcome content |

Zone-level publishing is the one operators most often get wrong, usually by publishing at
Facility level and being surprised that a residence group did not receive it — or the
reverse, as in [FW-225](https://github.com/podlodka-ai-club/flywheel/issues/225), a menu
request scoped specifically at the residence level.

Lower levels override higher ones. A chamber-level override will silently defeat a
facility-level publish for that chamber, and this is a genuinely difficult fault to see
from the Console. When exactly one chamber is wrong and everything else is right, check
for an override before anything else.

---

## 4. Change requests: required information

FSG performs content changes on the operator's behalf under some contracts. Before
accepting one:

- **Facility and scope level** — which of the five levels in §3.
- **Surface** — welcome screen, a specific channel, a menu, an information section.
- **Current state** — a photograph of the display, not a description.
- **Intended state** — exact text, or the asset itself.
- **Required live date** — and whether it may go live early.
- **Approval** — for anything brand-level, written approval from the operator's brand
  contact. Brand-level publishes reach every facility they run.

Text changes must arrive as text. Text transcribed from a photograph will contain an
error, and that error will be on several hundred displays.

---

## 5. Media specifications

Assets outside these bounds are rejected at ingest. Rejections are reported at publish
time, which is later than anyone would like, so check at intake.

| Property | Requirement |
|---|---|
| Video container | MP4, H.264 |
| Resolution | 1920×1080 native; 3840×2160 where the facility is licensed for it |
| Frame rate | 25 or 30 fps, constant |
| Audio | AAC stereo, present even where playback is silent |
| Bitrate | 8–12 Mbit/s |
| Duration | Welcome content ≤ 90 s; promotional ≤ 30 s |
| Images | PNG or JPEG, sRGB, 1920×1080 |
| Documents | PDF, ≤ 10 MB, embedded fonts |

### Two recurring asset defects

**Trailing black frames.** Editing software commonly exports a fraction of a second of
black at the end of a clip. On a looping welcome channel this reads to subjects as the
display having failed, and is reported as a fault rather than as a content problem — see
[FW-215](https://github.com/podlodka-ai-club/flywheel/issues/215) and
[FW-246](https://github.com/podlodka-ai-club/flywheel/issues/246). Trim trailing black at
ingest.

**Missing audio track.** A video with no audio track, as distinct from a silent one, can
fail to initialise audio for the surface it plays on and take the rest of that surface's
sound with it —
[FW-244](https://github.com/podlodka-ai-club/flywheel/issues/244). Require a track even
when it carries silence.

Colour management is also worth watching: assets authored in a wide-gamut colour space and
delivered without conversion render with visible shifts on chamber displays
([FW-004](https://github.com/podlodka-ai-club/flywheel/issues/4)). Convert to sRGB at
ingest rather than debugging it on a display later.

---

## 6. Channels and playlists

Promotional and informational video is delivered as channels. Multiple assets can be
assembled into a single channel that plays them in sequence and loops
([FW-246](https://github.com/podlodka-ai-club/flywheel/issues/246) is a routine example
of this request).

When assembling:

- Confirm the intended channel name with the operator before building it. It is
  subject-visible and awkward to change afterwards.
- Order is explicit, not upload order.
- Verify the loop transition on a real display. The seam between last and first asset is
  where trailing-black and audio-level defects become obvious, and it cannot be assessed
  in the Console preview.

---

## 7. Scheduled content

Menus and services carry operating hours, and content outside its window must not be
orderable.

Two failure modes are worth knowing:

**Windows crossing midnight.** A service running 10:00 to 01:00 spans two calendar days.
This is entered correctly far less often than you would expect —
[FW-197](https://github.com/podlodka-ai-club/flywheel/issues/197). Always confirm the
intended end time explicitly when it is earlier in the day than the start time.

**Visibility is not the same capability as orderability.** The platform can restrict the
hours during which a menu may be *ordered from*. It cannot hide a whole section from the
menu on a schedule. These sound like the same request and are not, and operators ask for
the first while describing the second.

[FW-036](https://github.com/podlodka-ai-club/flywheel/issues/36) is the case: an operator
asked for the night menu to be hidden during the day because subjects were scrolling into
it and getting confused. Scheduled section hiding is not supported, so ordering windows
were configured instead — day and night menus given explicit hours — which addressed the
confusion without delivering what was asked for. The capability gap itself was routed to
**Push RND/Product**.

When you accept one of these, say plainly which of the two you have configured. An
operator who believes a section is hidden and later finds subjects browsing it will treat
that as a regression.

---

## 8. Surface parity

The same content is delivered to chamber displays and to the subject application on
personal devices. These are separate rendering paths with separate caches, and they can
diverge.

Divergence in **pricing or availability** is a serious defect, not a cosmetic one. A
subject presented with one total on the display and another in the application will raise
it with facility staff, who will raise it with the operator, who will raise it with us
([FW-245](https://github.com/podlodka-ai-club/flywheel/issues/245)). Any content change
touching price, availability, or operating hours must be verified on **both** surfaces
before the ticket is resolved. Checking one is not checking.

---

## 9. Who may publish

| Role | May publish |
|---|---|
| Operator content editor | Facility, Zone, Chamber class, Chamber |
| Operator brand administrator | All levels including Brand |
| FSG Content Operations | All levels, on written request |
| FSG engineer | Nothing, except under §10 |

FSG engineers do not publish content in the ordinary course of work. Requests to "just
change this quickly" are routed to Content Operations, because the audit trail matters
more than the ten minutes saved.

---

## 10. Emergency publication and content freeze

**Emergency publication** — where content must change immediately for a safety, legal, or
reputational reason — may be performed by any FSG engineer with L3 approval. Record the
approver in the ticket and notify Content Operations the same day.

**Content freeze** applies during any active P1 at the affected facility, and for two
hours after resolution. Publishing during an incident makes the incident harder to
diagnose and has, historically, been mistaken for the incident. Requests received during
a freeze are queued and published after it lifts, unless they qualify as emergency
publication above.

---

## 11. Verification before closing

Do not resolve a content ticket on the basis of the Console preview. Preview renders from
published state and will show the change while every display in the facility still shows
the old one.

- [ ] Change visible in Console preview
- [ ] Change visible on at least one real chamber display
- [ ] Change visible in the subject application
- [ ] Loop transition checked, where a playlist was modified
- [ ] Both surfaces checked, where price, availability, or hours changed
- [ ] Operator has confirmed it is what they asked for
