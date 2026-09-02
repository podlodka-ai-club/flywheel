<!-- meta
id: known-issues-and-release-notes
type: reference
audience: support
tags: [known issues, release notes, bugs, incidents, firmware, bsp, hotsign, staff app, cloud incident, end of life, workaround, samsung, lg, netflix]
-->

# Known Issues and Release Notes

**Read this when:** a reported symptom looks like a bug rather than a configuration or network problem and you want to know whether it is already known, fixed, by design, or an incident — as of August 2026.

---

## 1. How to read this page

Status as of August 2026. "Open with R&D" means a task exists and no release date is promised — never quote dates. "Fixed" means the fix is live or available; check that the property actually runs it (app version at 1800 → Device, APK version on the tablet, player build in the HotSign admin). "By design" means the answer is an explanation, optionally with a feature request to the product manager. Incidents are recorded only here. The same defect at more than one property, or right after a release, is E-008 on [Escalate or Answer](Escalate-or-Answer).

## 2. Open with R&D

### K-001 — BSP APK 2.1.960: "TV On" / "Turn On" button does nothing
**Affects.** BSP / RoomConnect tablet app, version 2.1.960 (Control section, TV control page).
**Symptom.** Pressing "TV On" / "Turn On" does not power the TV on; other controls work. Reported from several properties of one partner and reproduced in our lab. It does not depend on the tablet's room status — "Room not set" tablets show it too.
**Status.** Open with R&D as of August 2026; a fix was announced for the next APK. Verify the installed APK version before assuming it is fixed.
**What to tell the customer.** Known defect in 2.1.960, fix in the next APK, no date. Ask them to confirm the APK version after the update and reopen if the button still fails.
<!-- evidence: FW-048, FW-054 -->

### K-002 — Samsung HG AU800 / BU800 / U800F: YouTube credentials survive check-out
**Affects.** Samsung hospitality sets of the HG AU800, BU800 and U800F ranges running Acme TV.
**Symptom.** After a proper PMS check-out and the automatic TV reboot the guest's YouTube account stays signed in; manual deletion works but the problem returns. Not the same as a missing check-out (Confusable-Symptoms X-007).
**Status.** Open with R&D. A corrected clone file is tried first; if that does not help, R&D needs a video of the full cycle (check-in, YouTube from a profile, check-out, reboot) plus Samsung epcontrol logs collected on a FAT32 USB stick.
**What to tell the customer.** Guest data surviving check-out is the E-002 path and is handled with priority. Collect the video and logs as instructed; no date can be promised.
<!-- evidence: FW-132 -->

### K-003 — WebApp: night-menu items orderable outside their working hours
**Affects.** Acme Guest App (WebApp) ordering with per-section working hours.
**Symptom.** Items from a section whose hours are closed can still be added to the cart and given a delivery time outside the configured range. Hiding a whole section on a schedule is not a feature — only ordering hours can be restricted.
**Status.** Reproduced by support; task with R&D (Push RND) as of August 2026.
**What to tell the customer.** Confirmed bug in the development queue; keep the working hours configured — they apply once the fix ships; no date.
<!-- evidence: FW-036, FW-159 -->

### K-004 — New admin panel: confirmation not reflected for the guest; cart items disappear
**Affects.** New admin panel (admin v2) order handling and the guest side of the app.
**Symptom.** Confirming an order in the new panel leaves the guest's Cancel option available until the page is refreshed, while the old panel applies it immediately. Separately, an order disappeared from MY CART after a language change or app restart. (Dry-cleaning "choose options" doing nothing on TV was fixed in the same thread.)
**Status.** Open with R&D as of August 2026.
**What to tell the customer.** Known difference between the panels; confirm in the old panel if the cancel window matters. Send screenshots with time and room when the cart issue recurs.
<!-- evidence: FW-056 -->

### K-005 — Native mobile app: paid add-on not added to the order total
**Affects.** Acme Guest App native mobile app, ordering with priced add-ons / options.
**Symptom.** An add-on with a configured price is sent at zero price from the phone, so the total equals the main item only; the same order from the TV sums correctly. Appeared after an update of another application touched the ordering module.
**Status.** Open with R&D; the fix → test → release sequence cannot be shortened.
**What to tell the customer.** Confirmed regression, being fixed, no date. Check totals in the admin panel before posting them anywhere.
<!-- evidence: FW-245 -->

### K-006 — E-mail mailing templates section shows an error
**Affects.** Admin panel e-mail mailings — the templates section, for every property that uses mailings.
**Symptom.** Opening the templates section returns an error and no templates are listed; reported across all properties of a partner at once.
**Status.** With R&D, critical priority requested; no ETA as of August 2026.
**What to tell the customer.** Known, platform-wide, with the development team; we cannot give a date. A list of their own affected properties can be provided on request.
<!-- evidence: FW-029 -->

### K-007 — Tablet webview firmware breaks some external links
**Affects.** In-room tablets (BSP) opening external links from content — table-booking pages, PDF menus.
**Symptom.** Some links open for about half a second and then show an error on the tablet, while the same URL works in any other browser; other links on the same page work.
**Status.** Root cause is the tablet device firmware; waiting for a fixed firmware from the tablet vendor.
**What to tell the customer.** Not a CMS or link problem; vendor firmware fix pending, no date. Keep the links as they are.
<!-- evidence: FW-030 -->

### K-008 — Staff app: random logouts and "incorrect password"
**Affects.** Acme Staff mobile app, latest version, Europe server.
**Symptom.** The app signs users out and then rejects the correct password; after several retries, or after a password reset in the CMS, login works again. Recurs weeks apart and at more than one hotel.
**Status.** Escalated to R&D; a link to cloud-provider outages is suspected. We need a video or screenshot captured while it is happening.
**What to tell the customer.** Keep the app updated, select the Europe server at login, record a video next time; a CMS password reset is the immediate workaround.
<!-- evidence: FW-085 -->

### K-009 — CMS: Hotel Rooms cover image does not update after publish
**Affects.** Admin panel content editing — the Hotel Rooms section cover image (the "About our hotel" cover is edited elsewhere in the CMS and does update).
**Symptom.** Upload, save, publish — the old cover stays on the TV and the uploaded image is gone on the next visit.
**Status.** Escalated to R&D; support replaces the image manually on request.
**What to tell the customer.** Send us the image and we upload it; the editor-side bug is with development.
<!-- evidence: FW-067 -->

### K-010 — RCU light dimmer cannot be switched on from the TV remote
**Affects.** Acme TV room control with the RCU type Light Dimmer.
**Symptom.** Volume Down switches the dimmer off, but it cannot be switched on from the TV; the Guest App controls the same light correctly. All rooms with that RCU type.
**Status.** A new TV app build was tested in a test folder on one TV and did not fix it; R&D re-checking as of August 2026.
**What to tell the customer.** Known and under investigation; guests can use the Guest App meanwhile.
<!-- evidence: FW-058 -->

## 3. Fixed recently

### K-011 — Admin panel password-reset link malformed — fixed
**Affects.** Admin panel password-reset e-mails (link valid 60 minutes).
**Symptom.** The reset e-mail arrived but its link did not work.
**Status.** Fixed by R&D (link generation corrected). If a reset still fails: check spam, the 60-minute validity and which login option the user needs; support can set a password manually and send it privately.
**What to tell the customer.** Request a fresh link and retry; if it still fails we set the password manually — never by e-mail to third parties.
<!-- evidence: FW-003, FW-169 -->

### K-012 — Guest App over VPN served a build with messaging enabled — fixed
**Affects.** Acme Guest App WebApp at properties with guest messaging disabled.
**Symptom.** Guests using a VPN on their phone received a different web-app version in which messaging was enabled, so messages arrived although the feature was off.
**Status.** Fixed; guests can no longer send messages when the feature is disabled.
**What to tell the customer.** Explained and fixed; report any new message with the time and the guest's device so we can check.
<!-- evidence: FW-148 -->

### K-013 — HotSign players: 4.x builds ignore Push Updates; RPi black screen after logo upload
**Affects.** Acme HotSign players — app builds 4.x, and Raspberry Pi players on old firmware.
**Symptom.** A 4.x panel refreshes content only after a device restart, not on Push Updates. RPi players show a black screen with the file name in the corner after a logo or video upload while the default image still plays.
**Status.** Resolved by updating the player build remotely to the current 5.37.12 (an arbitrary version such as 4.9.7 cannot be pinned) and by updating RPi player firmware remotely; players reboot afterwards.
**What to tell the customer.** We update players remotely; they confirm on a test screen first, then everywhere. Players must be online; reboot players that do not refresh.
<!-- evidence: FW-149, FW-170 -->

### K-014 — TVs took minutes to boot because of blocked external addresses — code fix
**Affects.** Acme TV app start-up where the TVs' external requests are blocked upstream.
**Symptom.** Every TV in the property eventually loads, but only after 6–7 minutes; IPs and server are correct and the interface loads instantly over VPN.
**Status.** Fixed in code — those external requests are bypassed and disabled. A property showing this again is on an old app build or has a real network problem.
**What to tell the customer.** Update the TV app; if the delay stays we look at the network (foreign devices in the TV DHCP suggest mixed networks).
<!-- evidence: FW-120 -->

### K-015 — Weather page on set-top boxes: empty icon and delayed data after power-on — fix available
**Affects.** Acme TV weather page on set-top boxes connected to the TV server port.
**Symptom.** After power-on the weather icon is empty and the data appears only after about five minutes; the date could show incorrectly. TVs are not affected.
**Status.** R&D delivered a weather-information synchronisation fix; properties confirm after a test on the same server port.
**What to tell the customer.** A fix exists; we apply it and ask the on-site contact to test on the STB.
<!-- evidence: FW-072 -->

## 4. By design / pending feature

### K-016 — Overdue-order reminders continue until the order is Completed
**Affects.** Order notification e-mails for Shop Orders and Service Requests.
**Symptom.** Staff confirm an order but overdue e-mails continue until it is also Completed; hotels ask to stop them at Confirmed or to change the cadence.
**Status.** By design. Configurable notification settings are planned by the product team; no date. A claim of missing overdue e-mails is diagnosed per concrete example (order, time) against the Mailgun log.
**What to tell the customer.** Reminders stop once the order is Confirmed and Completed; the setting will become configurable; we cannot say when.
<!-- evidence: FW-016, FW-043, FW-196 -->

### K-017 — Out-of-hours orders have no disclaimer; request history lacks details
**Affects.** Guest App ordering (WebApp, mobile, TV) and the guest's request history.
**Symptom.** Outside a section's working hours "As Soon As Possible" is unavailable and the order is scheduled to the nearest slot — guests do not notice and expect immediate delivery. In the history a request shows only its creation time, not what was ordered for which date and time.
**Status.** Both are in the development backlog: a notification for out-of-hours orders, and more detailed request history. No dates.
**What to tell the customer.** Current behaviour is intended; the improvements are queued as additional functionality; no ETA.
<!-- evidence: FW-159, FW-249 -->

### K-018 — HDMI connection: repeated presses break the connection
**Affects.** Acme TV Connectivity → HDMI connection.
**Symptom.** Nothing visible happens for a few seconds after the first press; guests press again and the HDMI input never switches. A single press followed by a wait works.
**Status.** UI request (ignore repeat presses or show a "connecting" message) passed to the product manager; not reproduced in the office. Also verify the device is plugged into the HDMI input configured in the menu item.
**What to tell the customer.** Check the configured HDMI input and whether all TVs or one are affected; the UX change is with product, no date.
<!-- evidence: FW-241 -->

### K-019 — Test orders cannot be placed from a browser
**Affects.** Testing Shop Orders / Service Requests through the WebApp in a desktop browser.
**Symptom.** A browser session logged in as a test room shows the content, but orders never reach the admin panel or the task tracker, and the 1800 service page does not open.
**Status.** Temporary limitation; ordering from the browser version is being worked on. Test from a tablet or TV in a vacant room.
**What to tell the customer.** The browser shows the visual part only; place test orders from a tablet or TV in a vacant room.
<!-- evidence: FW-073 -->

## 5. Recent incidents

### K-020 — Cloud infrastructure incidents after the provider change (July–August 2026)
**Affects.** Cloud-hosted functions in all regions: publish, admin panel login, room-status sync, check-in transfer, order forwarding to task trackers, notification e-mails, PMS webhooks.
**Symptom.** Short episodes: Publish accepted but nothing reached the TVs; both admin panels unreachable; room statuses not changing from the TV; check-ins delayed (3–5 hour estimates); orders reaching the task tracker an hour late or left in New after an error; order e-mails delayed and duplicated; PMS webhooks deactivating.
**Status.** Recovered as of August 2026; restoration estimates of 1–2 hours were typical. Follow-ups: webhook migration to the new API, a fix for order-forwarding errors.
**What to tell the customer.** Acknowledge, give the estimate, confirm recovery, ask them to recheck; republish content that did not propagate.
<!-- evidence: FW-041, FW-046, FW-086, FW-109, FW-150, FW-155, FW-193, FW-020, FW-065 -->

### K-021 — NA region: cloud provider blocked remote commands (BSP TV control lost)
**Affects.** Properties served from the NA region — remote commands from tablets / BSP to TVs; recurred after every CMS change.
**Symptom.** TV control from the tablets dropped for the whole property; rebooting the TV and then the tablet restored it temporarily.
**Status.** Root cause: the cloud provider blocked remote commands from the NA region. Commands were rerouted through EU temporarily and later routed back; recovered.
**What to tell the customer.** Incident, not a property fault. If BSP control drops again after a CMS change, reboot the TV, then the tablet, and report it with the time.
<!-- evidence: FW-188 -->

### K-022 — Unattended OS upgrade triggered a Keepalived failover and stopped the interface
**Affects.** Managed TV / HSIA servers with Keepalived failover.
**Symptom.** The interface showed "disconnected" and guests complained; the outage coincided with routine automated Ubuntu updates — a brief network re-initialisation made Keepalived treat the node as backup and stop the service gracefully.
**Status.** Resolved; failover scripts adjusted so routine maintenance no longer stops the service.
**What to tell the customer.** Explain the sequence, confirm updates are complete and the service runs; it should not recur.
<!-- evidence: FW-070 -->

## 6. Hardware end-of-life notes

### K-023 — Old LG sets: LX YouTube freezes, LY series channel lag
**Affects.** LG LX series (out of production) and LG LY series (e.g. 42LY750H, more than 10 years old).
**Symptom.** LX: YouTube freezes after an update, also on the legacy app port, with the latest firmware installed. LY: buffering and audio drops on high-bitrate channels while a laptop plays the same stream cleanly; firmware 3.32 did not help.
**Status.** Hardware limitation; nothing further on our side. We cannot lower stream quality per channel.
**What to tell the customer.** Not related to the Acme TV app; firmware is already current; replacing the sets is the realistic path. Keep the ticket open only while R&D still looks for mitigations.
<!-- evidence: FW-011, FW-061 -->

### K-024 — Features that depend on TV firmware or model
**Affects.** Chromecast audio, power-on at check-in (WOL), YouTube / Netflix availability, channel playback stability.
**Symptom.** Audio problems while casting; a TV that ignores WOL; "app not supported" for YouTube or Netflix; channels stopping and returning to the welcome screen.
**Status.** Resolved by TV firmware updates done by the hotel with our files and instructions (about 5 minutes per TV; LG service files need standby mode and a reboot). Netflix is not available on TVIP set-top boxes; on Philips the supported models are HFL6014U and HFL7111T.
**What to tell the customer.** Update firmware first, then the middleware if still needed; check the version at 1800 → Device or in Connected devices.
<!-- evidence: FW-025, FW-060, FW-198, FW-234, FW-230 -->
