<!-- meta
id: updates-maintenance-and-change-control
type: process
audience: support
tags: [updates, maintenance, firmware, test folder, maintenance window, change freeze, backups, server migration, ubuntu, stream service upgrade, hotsign build, rollback, verification]
-->

# Updates, Maintenance and Change Control

**Read this when:** a partner asks for an update (TV app, TV firmware, server, casting service, HotSign players), asks why we did not update them proactively, requests a change freeze or a maintenance report, or you need to plan and communicate a maintenance window.

---

## 1. Principles

### We do not push updates to all properties proactively
A reported issue is often specific to a TV model, a TV firmware version, or one installation and environment; a build that fixes one site can misbehave at another. Every update also needs prior notice, an agreed maintenance window and possibly downtime, and coordinating that with the hotel is the local partner's role. So when a partner asks "if this is a known bug, why was the fix not rolled out to all customers?", say exactly that, then offer to list which of their properties run older versions and schedule them one by one. Do not call something a known bug unless [Known Issues and Release Notes](Known-Issues-and-Release-Notes) says so; correct yourself if an earlier reply implied it. The same defect at several properties, or right after a release, is E-008 — R&D as a product bug.
<!-- evidence: FW-010, FW-046 -->

### Every update needs a window, a person on site, and verification
The update itself is short; verification is what takes time and what protects the guest experience. Before any update agree three things: the window (in the hotel's time zone, with occupancy in mind), a named on-site person who checks the TVs immediately afterwards, and the list of what they check. If nobody can verify, postpone — an unverified update in a full hotel is a worse outcome than a delayed one. A partner saying "the hotel is full, we cannot afford downtime" is a reason to choose the window carefully, not to skip the check.
<!-- evidence: FW-066, FW-010, FW-037, FW-058 -->

### Diagnostics start from the current version
When a property runs an old application version, updating it is the first step, not the last: R&D diagnoses on the latest version only, and many symptoms are already gone there. Establish which layer is old before promising anything — the app version at 1800 → Device (or Connected devices in the admin panel), the TV firmware, and the TV server OS. A partner who reads "update the servers" usually means the TV app; name the component in writing so nobody plans the wrong work.
<!-- evidence: FW-010, FW-037, FW-046, FW-234 -->

### Document lessons learned
After a large upgrade the partner may ask for observations to reuse at the next property. Give them a short list: prerequisites that worked (static IPs prepared, our ranges whitelisted in advance, a vacant test room), what slowed the work (a missing streamer address, a file link that would not download, a test room sold before the test), and what was verified. Also record in the ticket when a hotel declines a recommended migration and accepts the risk of an in-place upgrade; that note is what protects everyone later.
<!-- evidence: FW-199, FW-014 -->

## 2. TV app updates

### Timing and impact
A Acme TV app update takes up to 30 minutes; verification takes longer. Cloud deployments need preparation with R&D and can mean up to one hour of downtime. During the update TVs may need extra time to download and install the new app, and content can load more slowly right afterwards. A TV downloads the new app after a reboot: if 1800 → Device still shows the old version (legacy builds report 1.13), the TV has not picked it up yet — reboot it and check again before reopening the bug.
<!-- evidence: FW-010, FW-066 -->

### Test-folder method — the preferred path, step by step
1. Support places the new version in a separate folder on the property's TV server and sends an internal test address.
2. The partner names a vacant room; hotel staff enter the test address on that TV (it is typed into the TV, not pushed from the panel).
3. Support confirms the room is configured with the new build.
4. The on-site person checks the full function list: menu and content, channels, apps, room control, ordering, welcome page, check-in behaviour.
5. If everything passes, support updates the main folder and the rest of the property picks it up after reboot.
6. If something fails, the test TV goes back to the main address, support re-checks the build, and nothing else changes.
A test room can be sold before the test — ask for a room that is ready before we start the setup. The hotel may need to hard-reboot the test TV (hold Power, or unplug it).
<!-- evidence: FW-037, FW-058, FW-066 -->

### Whole-hotel method
The main folder is updated directly and every TV takes the new build after reboot. It is chosen for large properties where per-TV testing is impractical, and it needs a person on site for about 30 minutes of checks right afterwards. It still needs prior notice and a window; the risk is that a build problem shows on every TV at once, so keep the previous build at hand to restore.
<!-- evidence: FW-066, FW-010 -->

### After the update
"Still broken after your update" has three usual answers: the TV has not downloaded the build (version at 1800 → Device, then reboot); content is slower for a while (expected); or the bug survives on the new version — then it is a product bug for R&D with the 1169 log photographed and the room named. One more check: an update of one application can affect another module (an ordering regression followed an unrelated release), so after any release spot-check an order from the TV and from the phone and compare the totals.
<!-- evidence: FW-010, FW-058, FW-245 -->

## 3. TV firmware

### Who updates firmware and how
TV firmware is updated by the hotel with the files and instructions we provide; budget about 5 minutes per TV. We send the package and instructions to the hotel's technical contact through a file-transfer link — confirm who should receive it. Links from our file server sometimes fail to download: re-upload to another server and resend, or point to the manufacturer's site for the latest version. For LG sets we can queue the update and send a reboot so the TVs request the LG service files — standby mode must be enabled on the TV, then reboot; a set that did not update gets another reboot with standby on. Verify the version at 1800 → Device or in Connected devices. Order of work: firmware first, then the middleware (TV app) if the symptom remains.
<!-- evidence: FW-025, FW-061, FW-198, FW-234 -->

### Model examples from tickets
Use these as examples of what firmware fixes, not as a version table. Philips sets that ignored Wake-on-LAN: firmware 205.002.206.001 was recommended as much newer than what the hotel ran. LG 42LY750H-ZA with channel lag: version 3.32 was tried and did not help — a hardware limit of the LY series. Samsung AC690 and AU800/Q60A series with channels dropping to the welcome screen: packages on our file server per model. Chromecast audio problems: TV firmware on all sets, then a remote system update and a re-test. Samsung firmware-level defects need epcontrol logs collected on a FAT32 USB stick. Old LG LX and LY sets are end of life — see [Known Issues and Release Notes](Known-Issues-and-Release-Notes).
<!-- evidence: FW-060, FW-061, FW-234, FW-025, FW-132 -->

## 4. Server changes

### Ubuntu upgrade and migration to the hotel's VM
TV servers still on Ubuntu 18 should move to 24 or newer; an old Apple or stream service on an old OS misbehaves with a current TV app. Two paths. (1) The hotel provides a VM: they deploy Ubuntu and add the interfaces — one for access and internet, a TV interface into the TV network, a Wi-Fi interface into the guest network, and a PMS interface or a route to the PMS server; our engineers migrate everything else (VPN client, PMS interface, Zabbix agent, stream and Apple services, the rest of the configuration). (2) An in-place upgrade when the hotel cannot provide the VLANs or a VM: the hotel accepts the risk in writing and the deployment team sets a date. Management-company approval is often needed — allow time for it.
<!-- evidence: FW-014 -->

### Unattended upgrades and failover
Managed servers run automated OS updates. A brief network re-initialisation during one made Keepalived treat the node as switching to backup and stop the service gracefully, which showed as "interface disconnected"; the failover scripts were adjusted so routine maintenance no longer stops the service. When an interface drops with no change on the hotel side, ask whether updates were running and confirm that they completed and the service is up.
<!-- evidence: FW-070 -->

### Hardware failures and recovery
A failed power supply or a damaged filesystem shows as "no connection" on every TV and a server that boots with many errors. Sequence: reboot; if it persists, follow the recovery instruction for the BusyBox/initramfs prompt; if that fails, the disk is probably dead — replace it and reinstall. After recovery the system may ask for authorisation — that is normal; check the TVs. After a storm, treat TV errors as a network problem first (laptop on the TV's cable, IP from the TV range, server address opened in a browser).
<!-- evidence: FW-087, FW-226 -->

### Backups and maintenance reports
Managed servers are backed up twice a month; on request we send a screenshot of the latest backup, and a backup can be taken on an agreed date for the partner's records. Some partners run a scheduled maintenance report: the outputs of free -h, listings of the zabbix, nginx, chanadmin and pmsdaemon logs, lsb_release -a, cat acme/version.json, df -h, lsblk and top, sent as screenshots together with an exported spreadsheet. Where the partner has their own server account they run the commands themselves; accounts are per site, so a second site may need its own account before they can.
<!-- evidence: FW-158 -->

### Whitelisting before remote work
Before server work or an upgrade, the hotel firewall must allow our platform ranges (admin, statistics, queue, HSIA, VPN, monitoring, analytics, debug and PMS-hub endpoints, our office networks and WireGuard gateways — the list is sent separately, never quoted from memory) and the PMS service address and port. Partners can prepare this in advance to make the window smooth. Details on [Remote Access and Connectivity](Remote-Access-and-Connectivity).
<!-- evidence: FW-250, FW-199 -->

## 5. Stream service and casting upgrades

### AcmeStream upgrade (about 1.5 hours)
Restarting AcmeStream fixes "All devices busy" for a while; the upgrade fixes it. Steps: agree the time; the hotel assigns static IPs to the Chromecasts and sends the MAC/IP list (a missing device can be added later); we upgrade the stream service (about 1.5 hours), add the devices with their addresses, and need the streamer's IP address to map the IPTV streams to the Chromecast names; the MikroTik is updated as part of the new version; the physical session controllers are removed. Legacy installs with controllers suffer Chromecasts losing power and needing manual switch-on — a reason to upgrade, not a ticket to reopen weekly. Afterwards the hotel verifies casting on site and monitors it for a few weeks.
<!-- evidence: FW-199, FW-015, FW-014 -->

### Apple TV service and HLS support
The Apple TV option runs an Apple service on the TV server. An old Apple service with a current TV app misbehaves; the fix is the server OS upgrade plus the Apple service update, with the set-top boxes updated by the hotel. Hide the AppleTV tab on request while it is broken. Adding HLS support to a property needs a Acme version update planned like any TV app update — quote up to 30 minutes plus verification and ask which method the partner prefers.
<!-- evidence: FW-014, FW-066 -->

## 6. HotSign player builds

### Player updates are remote and always to the current build
Support updates HotSign players remotely; the current build is 5.37.12, and a specific older version (for example matching other panels on 4.9.7) cannot be pinned. The player reboots after the update. When a build or player firmware is suspected (Push Updates ignored, content refreshing only after a restart, a black screen with the file name in the corner after a logo upload), update one test screen, let the partner confirm it, then update the rest. Players must be online for any of this. The user manual is linked inside the HotSign admin.
<!-- evidence: FW-149, FW-170 -->

## 7. Change control

### Change freezes and sensitive periods
Hotels request freezes around executive visits, brand audits and mystery-guest evaluations, often because a previous visit was disrupted. We honour them: acknowledge in the ticket, relay to engineering and the project managers, and make no changes in the period unless there is a critical emergency. A freeze does not pause incident work; it pauses planned updates, testing and implementation. Note the period in every related ticket so nobody schedules into it. Wording like "brand requirement", "mystery guest", "owner" or "renewal" is E-007 — involve the account manager.
<!-- evidence: FW-105, FW-013 -->

### Agreeing a window and confirming completion
Windows are agreed in the hotel's time zone with a named on-site contact who will be there. Support announces completion in the ticket; the hotel verifies; the partner confirms — then Resolved. A property still in the installation stage goes through the project manager and the project chat, not the support queue; if the partner says the hotel was handed over, ask the PM to update the CRM record and proceed. If our engineer cannot connect at the agreed time (a remote-desktop request not accepted), say so at once and propose a new slot rather than letting the hotel wait.
<!-- evidence: FW-031, FW-037, FW-198, FW-010 -->

### Never edit a working integration in place
For integration changes (a PMS webhook migration, a callback domain change) create the new configuration alongside the working one, switch over in an agreed window, test with real scenarios (name change, room move, reservation update), and roll back to the old one if the tests fail. Typical wording to the partner: the change and tests take under an hour with no guest impact; rollback is a switch back. Do not bundle unrelated changes into the same window.
<!-- evidence: FW-193, FW-196 -->

## 8. Communicating an update

### What to tell the partner before
State, in one message: what is updated (component and version), how long it takes, the expected downtime (TV app up to 30 minutes, cloud deployments up to an hour, stream service about 1.5 hours), the risks (TVs need extra time to download, slower content right after, model-specific behaviour), what the hotel prepares (a vacant test room, standby mode on LG sets, static IPs for Chromecasts, whitelisting), who verifies and what they check, and the rollback (main folder restored, test TV pointed back, old webhook re-enabled). Ask for the window in the hotel's time zone.
<!-- evidence: FW-010, FW-066, FW-193, FW-199 -->

### What to tell the partner after
Confirm completion and ask the hotel to check; explain that TVs pick up the new app after a reboot and that content may load slowly for a while; give the version check (1800 → Device, or Connected devices); and say how to report residual issues — room number, time, photos of 1800 and 1169. Keep the ticket in Resolved until the partner confirms; if they report the same symptom, verify the version before reopening it with R&D.
<!-- evidence: FW-010, FW-198 -->

## 9. Triage patterns

### Pattern — "Why weren't all our properties updated proactively?"
The partner has seen the symptom at several properties and expects a fleet-wide fix. Answer with the principle (model, firmware and environment specificity; notice and windows are per property), offer a version check across their properties, and schedule each one. If the same defect really shows at several sites, escalate it as E-008.
<!-- evidence: FW-010 -->

### Pattern — "Please update the TVs" with no component named
Ask what they see and pull the versions: app (1800 → Device), firmware (Connected devices), server OS. "App not supported" for YouTube or Netflix and unstable channel playback point to firmware; cosmetic and functional bugs to the app; an old Apple or stream service to the server. Answer with the component, the method and the time it takes.
<!-- evidence: FW-046, FW-234, FW-014 -->

### Pattern — "Still broken after your update"
Check that the TV downloaded the build (version at 1800), reboot it, allow for slow content right after, then reproduce on the new version with a 1169 photo and the room number. Only then reopen with R&D; a build that was tested in a test folder and did not fix the symptom goes back to R&D with that result stated.
<!-- evidence: FW-010, FW-058 -->

### Pattern — "The firmware link does not download"
File-server links fail from time to time. Re-upload to another server and resend, or give the manufacturer's download; ask the hotel to update one TV first and confirm the version at 1800 → Device before doing the rest. Confirm who should receive the file — the technical contact, not a third party.
<!-- evidence: FW-061, FW-025 -->

### Pattern — "Can you apply this setting to all TVs remotely?"
Some settings (Virtual Standby for fast boot) live in the TV's hotel-mode service menu; whether they can be applied remotely and in bulk depends on the TV model, and for some models it is manual per set. Say so before the hotel plans on a remote rollout across hundreds of rooms.
<!-- evidence: FW-049 -->

### Pattern — "Freeze all activities at the property"
Acknowledge, relay to engineering and the project managers, confirm in the ticket, and stop planned work for the period; emergencies are still handled. Check other open tickets for the property so nothing is scheduled into the freeze, and tell the partner what will happen to work already agreed.
<!-- evidence: FW-105 -->

### Pattern — "Send the maintenance report / backup screenshot"
Clarify what is needed and when (command outputs any time, the backup on the agreed date); point the partner to their own server account where one exists; send screenshots for sites without an account; backups run twice a month and a screenshot of the latest one is the standard answer.
<!-- evidence: FW-158 -->

### Pattern — "Casting has been broken for months"
A restart is not a plan. Offer the stream-service upgrade with a date, list the hotel's prerequisites (static IPs, whitelisting), and if audio is the symptom, the TV firmware update first. A fault older than 30 days without a dated plan is E-009; commercial-risk wording (recommendation to owners, a second property at stake) is E-007.
<!-- evidence: FW-025, FW-199, FW-015 -->
