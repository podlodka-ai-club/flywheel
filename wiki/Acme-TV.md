<!-- meta
id: acme-tv
type: product
audience: support
tags: [acme tv, tv app, iptv, lg, samsung, philips, set-top box, service codes, 1800, registration, licences, welcome page, check-in, check-out, content]
-->

# Acme TV

**Read this when:** a ticket is about the interactive TV application on hotel TVs or set-top boxes — boot, registration, licences, the welcome page, check-in/check-out behaviour, content and apps on the TV.

---

## 1. What it is

Acme TV is the interactive TV application (IPTV middleware) on hotel TVs and set-top boxes. Three parts work together, and the first question on any TV ticket is which of them — or which thing the hotel owns — is failing.

### The three parts: TV app, TV server, Acme cloud
The **TV app** runs on the set (or box); the TV loads it from the **TV server** — an on-prem Ubuntu server/VM, or a cloud deployment — which carries the web front end, chanadmin (the channel list), the PMS interface, the streamer with its streameradmin UI, the OpenVPN client and a Zabbix agent; DHCP for the TV network is often served from it. The **Acme cloud** holds the admin panel/CMS, the queues that carry check-ins, orders and postings, and notifications. Commands to the TV (power on, reset at check-out, content refresh) come from the admin panel/cloud; channel streams come from the hotel network and the TV app only tunes to them. Channels are covered in [TV Channels and Video Streaming](TV-Channels-and-Video-Streaming), casting in [Casting, Chromecast and AirPlay](Casting-Chromecast-and-AirPlay), the panel in [Admin Panel and CMS](Admin-Panel-and-CMS).
<!-- evidence: FW-192, FW-021, FW-229 -->

### Who owns what
**We own the app and the server software**: registration, content, PMS commands, the streamer, the casting service and the code the TV runs. **The hotel owns the TV sets, their firmware updates (done by the hotel with the files and instructions we provide), the TV network (VLANs, switches, DHCP when it is not on our server, the server's internet uplink) and power.** "Our software is an application on the TV": when a set does not answer Wake-on-LAN, ignores the remote or hangs in firmware, we cannot switch it on or fix it remotely — we can only say what to check. When the server's power supply dies or the network blocks a segment, the hotel repairs it; we guide the software recovery. The system does not process TV streams. State this boundary early and politely; most long TV threads are arguments about it.
<!-- evidence: FW-060, FW-087, FW-226, FW-229 -->

## 2. Supported devices

Always get the exact model (1800 → Device, or Connected devices in the admin panel) before promising anything about apps, firmware or standby behaviour.

### LG hotel TVs (LX, LY and US series)
LG hotel-mode sets are the most common. Older LX and LY series (for example 49LX761H, 42LY750H) are 10+ years old and out of production: YouTube is not guaranteed on LX sets even on the latest firmware, and LY sets lag on high-bitrate channels because they run out of buffering memory. Newer US series sets (for example 43US662H) play the same streams without trouble. On hotel-series LG sets the Acme TV app is the only way to watch IPTV — there is no channel viewing without it. LG firmware goes through LG service files: the TV requests them after a reboot, and standby mode must be enabled. The hotel-mode service menu is Mute → 1 → 1 → 9 → OK; Virtual Standby lives there, and for at least some models it cannot be applied to a fleet remotely — it is set per TV.
<!-- evidence: FW-011, FW-061, FW-144, FW-198, FW-049 -->

### Samsung HG series (AU800, BU800, U800F, AC690, Q60A)
Samsung hospitality sets appear as HG models: the AU800/BU800/U800F family, AC690 and Q60A series. They are configured by cloning (a clone file pushed to the sets); firmware packages for the models in use are placed on our file server and applied by the hotel — severely outdated firmware makes channels drop back to the welcome screen mid-programme. When R&D needs TV-side logs from a Samsung set, the epcontrol procedure applies: unzip epcontrol_info.zip, copy the epcontrol_info folder to the root of a FAT32 USB drive, plug it into the TV (it may reboot; if not, restart it), reproduce the issue, wait about 5 minutes, check that epcontrol\epcontrol_data is not empty, zip the epcontrol folder and send it. A case of YouTube credentials surviving check-out on the HG AU800/BU800 range is tracked in [Known Issues and Release Notes](Known-Issues-and-Release-Notes).
<!-- evidence: FW-132, FW-234 -->

### Philips HFL, Loewe and set-top boxes (TVIP, LG boxes)
Philips hospitality sets: HFL5214U (streaming apps go into the Entertainment section), HFL6014U and HFL7111T (the models that support Netflix; an installation guide for Netflix with App Control is in our documentation). Philips firmware is updated by the hotel from the link and instructions we send; a Philips set that ignores the power-on command at check-in and does not answer Wake-on-LAN is a firmware/hardware case first. Loewe sets are also in the field and are handled like any other hotel TV from our side. Set-top boxes are TVIP boxes and LG boxes: on TVIP, Netflix cannot be installed at all, casting works only through the encoder path, and the weather page can stay empty for minutes after power-on (with R&D); audio dropouts on LG boxes go to R&D. Registration reset on a box is the same code 1105 as on a TV — no factory reset needed.
<!-- evidence: FW-143, FW-230, FW-060, FW-028, FW-017, FW-072, FW-223 -->

### What differs between device types
Four things change with the device. (1) App availability: Netflix/YouTube depend on the TV model and firmware, never on our app — not on TVIP; Philips HFL6014U/HFL7111T yes; old LG LX not guaranteed. (2) The firmware path: LG service files via a reboot with standby enabled; Samsung and Philips packages from our file server applied on site — always by the hotel. (3) Power behaviour: Virtual Standby (LG service menu) makes boot fast; Wake-on-LAN is the fallback power-on path and must be enabled on the set and allowed on the network. (4) Cloning: Samsung and LG sets are cloned from a clone file; a new device that cannot get a licence shows "License Limit Exceeded" during cloning, and a bad clone can leave an 8-digit password prompt on the screen.
<!-- evidence: FW-230, FW-198, FW-049, FW-138, FW-034 -->

## 3. Service codes on the remote

Codes are typed on the remote from the Acme TV main menu. If the app itself has not loaded, the codes do nothing and the ticket is a boot/network case.

### 1800 — the diagnostic page (Network, Device, Authorization)
1800 opens the diagnostic page. **Network** shows whether the TV reaches the server and the cloud — a request that never arrived at our cloud shows up here as a network status. **Device** shows the TV model, firmware and the installed app version; this is where you verify that an update actually landed. **Authorization** shows the registration state (room, licence). Photos of these three sections are the standard first ask on almost every TV ticket, together with an example room and a video of the symptom. When the main menu is unreachable, the same page opens with the red button from the TV mosaic. On tablets: tap the room number repeatedly until a popup appears, then enter 1800. A browser session of the TV interface shows content only and cannot open the service page.
<!-- evidence: FW-032, FW-189, FW-192, FW-168, FW-061 -->

### 1169 / 1173, 1105, 100 and the LG service menu
**1169** shows the application log on the TV (**1173** on some builds); ask for a photo of the yellow and red lines right after reproducing the problem. **1105** resets the TV registration (the room number) without a factory reset — for a TV registered under the wrong room or moved to another room. **100** forces a content refresh when a publish has not reached the TV; a power cycle does the same. **Mute → 1 → 1 → 9 → OK** opens the LG hotel-mode service menu (Virtual Standby is there); on a cloned LG set this sequence can bring back the 8-digit password prompt.
<!-- evidence: FW-144, FW-230, FW-223, FW-163, FW-004, FW-049, FW-034 -->

## 4. Registration, rooms and licences

A TV is "registered" when the app is installed, a room number was entered and the TV authorised against the cloud — which consumes one TV licence.

### Registering a TV and moving it to another room
A new TV needs the Acme TV app installed and a room number entered. The room appears in the admin panel when the TV authorises; if authorisation fails (for example, no free licence) the room is created but shows no device data. A TV registered under the wrong room (typical: an extra digit) is fixed on the TV with 1105 and a fresh registration. Moving a TV to another room is done by support in the admin panel: the partner sends the TV MAC and the target room, and the TV must be powered on while we do it. For brand-new sets ask the hotel to install the app and enter any room number first — then we reassign. A TV parked in a test room still holds a licence.
<!-- evidence: FW-168, FW-163, FW-213, FW-218 -->

### Cloning and the 8-digit password prompt
Samsung and LG hotel sets are cloned from a clone file. Two pop-ups come up around cloning. "License Limit Exceeded" means the new device could not get a TV licence — nothing is wrong with the clone; free a licence or buy more (next entry). An 8-digit password prompt after cloning locks the remote: enter all zeros, or plug a USB keyboard into the TV and type the code from it. If the prompt returns whenever someone opens the service menu (Mute → 1 → 1 → 9 → OK), ask for the clone file and have it checked in the lab. Cloning is also the fastest way to push a corrected configuration to a whole fleet, but it does not replace log collection when R&D asked for logs.
<!-- evidence: FW-034, FW-138, FW-132 -->

### Licences: what consumes them and who changes the count
Every authorised TV or set-top box consumes one TV licence. When licences are exhausted a TV cannot authorise: the room shows no model/MAC/firmware in Connected devices and the welcome screen greets "Guest". Test TVs consume licences too — ours and the partner's head-office sets — and so do devices that have not been switched on for a very long time; removing them frees licences immediately. TV licences and Cast licences are separate counts, and tablets are counted separately from TVs. Support can tell the partner how many licences are purchased and in use and can remove stale devices; new licences are bought through the account manager, and after commercial approval support updates the counts — see [Licensing and Commercial Requests](Licensing-and-Commercial-Requests).
<!-- evidence: FW-168, FW-138, FW-011, FW-204 -->

## 5. Welcome page and guest greeting

The welcome page is the first screen after power-on: artwork or video plus the greeting and a welcome message.

### Static image or video; "Dear {Surname}"
The welcome page is either a static image or a video. Sound is only possible with a video file: a hotel that wants music on the welcome screen has to send a video (a still image with the audio track laid over it), not an audio file. The greeting is "Dear {Surname}" — the PMS sends us the surname only, so a first name (or first name plus surname) needs the PMS to send that data; it is not a setting on our side. The greeting and the welcome message are editable text fields in the admin panel, provided the layout is greeting first, then the welcome message in the dedicated field; a greeting baked into the artwork ("Dear Valued Guest" drawn on the image) can never show a name. The welcome window has size limits — a several-paragraph text fills the screen, so recommend a short version and ask for artwork without text when we re-fit it. Demo stands with the standard welcome layouts can be shown on request.
<!-- evidence: FW-244, FW-239, FW-208 -->

### Uploading a welcome video and verifying it
Welcome videos are uploaded through streameradmin on the TV server (reachable from the hotel network with the issued credentials, or over VPN): Streams → +video, upload with "Convert video to Acme supported format", copy the resulting file name and reference it in the admin panel as `video/FILE.mp4`. Keep files ≤ 3 GB, 720p mp4 recommended (the converter outputs 1280x720). A video channel (channel 1, managed in streameradmin) can be set as the welcome instead — it loops, but we do not recommend it because the broadcast can be unstable. After a change wait about 20 minutes, then power-cycle one TV; if the old page still shows, reboot and re-check before assuming an upload problem — we can connect to that TV to watch playback. A clip that ends on black frames shows a black screen at the end: trim it. We upload a ready file only; a QR-code end card must be part of the video.
<!-- evidence: FW-244, FW-214, FW-216, FW-215, FW-247 -->

## 6. Check-in / check-out behaviour on the TV

Everything here is driven by PMS events. Details of the interface itself are in [PMS Integration](PMS-Integration).

### Check-in: power-on, greeting and the fallback paths
On a PMS check-in the TV powers on, shows "Dear {Surname}", Wi-Fi login by room number + last name starts working and the guest appears in the Guest list. Power-on is a command from the admin panel/cloud to the TV app; Wake-on-LAN is the fallback when the TV did not process it — WOL must be enabled on the set and allowed on the network. Virtual Standby ON makes the TV boot in seconds rather than half a minute. If a TV still does not turn on, the set is in a state where firmware or hardware ignores the command: reproduce with a test check-in, note the room and the times of check-in and of discovery, power-cycle the set and update its firmware. Login attempts made before the PMS check-in is registered fail — not a fault. After a server/VM restart (power outage) TVs may show the room greeting without a name until support repairs the guest data on the server.
<!-- evidence: FW-060, FW-013, FW-049, FW-156 -->

### Check-out: account reset, "Guest" and the previous guest's name
On a PMS check-out the TV resets guest accounts (YouTube, apps) and goes to standby. Without a PMS check-out no reset command is ever sent — a room with old records pending "Checked Out" in the admin panel keeps the previous guest's YouTube login on the TV. Fix: the hotel checks the guests out (PMS, or manually in the admin panel), the TV reboots and the accounts clear; support can run a bulk automatic check-out and enable the per-property option that auto-checks-out guests N hours after the planned departure. A previous guest's name on the next guest's TV is E-002 in [Escalate or Answer](Escalate-or-Answer). "Guest" instead of a name while the admin panel shows the guest correctly means the TV could not authorise — licences, not PMS. A wrong surname is what the PMS sent; ask which room and guest should be shown, plus 1800 photos.
<!-- evidence: FW-157, FW-132, FW-013, FW-168, FW-181 -->

## 7. Content on the TV

Content is authored in the admin panel and reaches the TV through Publish; what a given TV shows is decided by its Display Group and menu.

### Publish, propagation and forcing a refresh
Content changes reach the TV only after Publish; propagation takes up to about 20 minutes. Force it with code 100 from the main menu or a power cycle. When a publish "does nothing": the section must exist in Menu Builder (content saved to a section that is not in the menu never shows); each item carries device types (TV, WEB, GUESTAPP) — a change visible in the guest app but not on the TV is the first hint that the TV type is missing; publish from the main admin panel while the old and new panels coexist; a cloud incident can silently break publishing for a while (re-publish afterwards). Section cover images are changed in a specific place in the CMS, not on the item. When preview is unavailable and a broken layout was published anyway, support re-publishes.
<!-- evidence: FW-182, FW-004, FW-160, FW-050, FW-109, FW-067, FW-154 -->

### Menu Builder, Display Groups and the app cache
Menu Builder defines which sections exist on the TV menu. Display Groups assign a menu to a set of TVs — a public-area TV can get a one-page menu with channels only, guest rooms a full one. The Smart TV apps ("Applications") section appears only on TVs registered under a room that belongs to the Display Group, so a missing section on one TV is usually a registration problem, not content. Images must be in a supported format; a colour-shifted or greyed image in Special offers is re-uploaded from the original and refreshed with code 100. The TV app caches content and the channel list: a renamed channel or a new item shows the old name until the cache refreshes on its own — a power cycle applies it immediately.
<!-- evidence: FW-144, FW-163, FW-004, FW-246 -->

### Entertainment section, Smart TV apps, Netflix and YouTube
Streaming apps (regional services such as KION, IVI, OKKO, Kinopoisk, and Netflix or YouTube) are exposed through the Entertainment / Smart TV apps section; support adds them for the property. Netflix is enabled by support in the source settings and published; the app then appears on the TVs automatically — nothing on the hotel side. Whether an app runs depends on the TV model and firmware: Netflix cannot be installed on TVIP boxes; Philips HFL6014U and HFL7111T support it; YouTube on old LG LX sets is not guaranteed even on the latest firmware (test on the legacy app format on the alternate server port before giving up). "App not supported" on YouTube/Netflix means the TV firmware is outdated — schedule a firmware update (LG: reboot with standby enabled so the set requests the service files) and update the TV app alongside. Do not promise an app for a model you have not checked.
<!-- evidence: FW-143, FW-243, FW-230, FW-198, FW-011 -->

### HDMI connectivity, Room Control, Inspect
The Connectivity item "HDMI connection" switches the TV to the input configured for that item; if the guest's device is plugged into a different HDMI port nothing happens. Pressing the item repeatedly while the switch is in progress can break it — a UI change (ignore repeated presses / show a "please wait" message) has been passed to the product manager; meanwhile confirm the physical port matches the configured one and whether it happens on all TVs or one. Room Control on the TV talks to the hotel's GRMS vendor (see [In-Room Tablets and Room Control](In-Room-Tablets-and-Room-Control)): errors returned by the vendor for a room are visible in our logs, and the partner raises them with the vendor. The Inspect module shows housekeeping inspection tasks on the TV; when tasks are missing on some TVs, check whether the request reached the cloud at all (1800 → Network) before suspecting the PMS.
<!-- evidence: FW-241, FW-074, FW-192 -->

### Minibar posting, View Bill, weather and airport schedule, languages
Minibar items entered on the TV are posted to the PMS folio; a posting that does not reach the folio is E-005 — check the whole period, remember that postings after check-out are rejected by OHIP and that new article codes appear only after the integration cache refreshes ([PMS Integration](PMS-Integration)). View Bill returning "error 9: Data unavailable" is fixed on our side — collect the room and re-test. The weather page and the airport schedule are content modules: on set-top boxes the weather icon can stay empty for about five minutes after power-on (with R&D; re-tests are done on the same server port); airport-schedule text blending into a white background was fixed by updating the app to the current version. Interface languages are enabled or disabled per property; a "Languages" option that returns "Data Unavailable" in the single-programme view is an old-app-version bug.
<!-- evidence: FW-021, FW-191, FW-072, FW-037, FW-010 -->

## 8. Updates in brief

Full procedure in [Updates, Maintenance and Change Control](Updates-Maintenance-and-Change-Control). Essentials: the TV app update itself takes ≤ 30 minutes, verification longer. Preferred "test folder" method: the new version goes into a separate folder on the server with an internal test URL, one TV is pointed at it, the on-site person checks everything, then the main folder is updated. TVs download the new app after a reboot; verify at 1800 → Device — a set still reporting a legacy build such as 1.13 has not downloaded it yet. Cloud deployments need R&D coordination and can mean up to 1 hour of downtime; content loads slower right after an update and the hotel should verify TV functionality once it is done. We do not push updates to all properties proactively: issues are TV-model/firmware/environment specific and a maintenance window has to be agreed with the partner. HLS channel support requires a current app version. TV firmware is updated by the hotel with the files and instructions we provide; LG service files need standby mode enabled and a reboot.
<!-- evidence: FW-066, FW-037, FW-010, FW-198, FW-046 -->

## 9. Triage rows

Each row is self-contained. Intake gates Q-001…Q-008 are in [Ticket Intake Checklist](Ticket-Intake-Checklist); escalation triggers E- in [Escalate or Answer](Escalate-or-Answer).

### T-TV-01 — Black screen at power-on, the app never loads
**Symptom.** The TV turns on but shows a black screen instead of the Acme menu, sometimes an error that the server is unreachable; one room, a floor, or a building. In one variant the app appears only after 6–7 minutes of waiting.
**First checks.** Q-003 scope. Does the TV get an IP from the TV range (1800 → Network, or a laptop on the same cable)? Can that laptop open the server address in a browser? Is DHCP for the TV network on our server or the hotel's, and is it alive? Anything changed on the network (Q-006)? App version at 1800 → Device.
**Typical cause.** Network: wrong VLAN on the port, IP from the wrong range, DHCP down, a segment that cannot reach the server, mixed networks flooding the TV VLAN. The minutes-long boot was the app calling external addresses that were blocked upstream — R&D disabled those requests in the code.
**Owner.** Hotel IT / network contractor. Acme Support confirms the server and the TVs' status in the admin panel; R&D for the blocked-address variant.
**Fix or answer.** Give the laptop test (same cable → IP in TV range → open the server address) and the room list. If the laptop gets an IP but cannot reach the server while other TVs work, the network is blocking — hand it to the hotel with that evidence. Update the app if it is old.
**Also asked as.** «чёрный экран при включении телевизора», «телевизор не грузит приложение», «телевизор загружается 6–7 минут», "interactive menu does not load", "TV shows only black"
<!-- evidence: FW-120, FW-226, FW-236, FW-082 -->

### T-TV-02 — "No connection" on all TVs at once
**Symptom.** Every TV shows a no-connection message or the platform home screen without the TV application; the admin panel shows the property offline; check-ins stop appearing on TVs.
**First checks.** Is the TV server reachable from our side (VPN, Zabbix)? Is it powered and booting? What happened — power outage, server reboot, storm? Q-006.
**Typical cause.** Server down: power supply failure, filesystem damage after a hard stop (the server boots into BusyBox/initramfs), a server without internet, or simply a very slow start after a reboot.
**Owner.** Acme Support (software recovery); hotel IT for hardware, power and the server's internet link.
**Fix or answer.** Whole-property outage is E-006. Ask the hotel to check the server state and give remote access (AnyDesk) if they believe it is up. Sequence: reboot → if it drops into BusyBox/initramfs, follow our recovery instructions → if that fails the disk is probably dead: replacement and reinstall. If the interface merely took long after a reboot, wait and re-check before doing anything.
**Also asked as.** «нет соединения на всех телевизорах», «сервер не загружается», «не запускается интерфейс после перезагрузки сервера», "TV interface does not display check-ins", "whole TV system down"
<!-- evidence: FW-087, FW-009, FW-200, FW-032 -->

### T-TV-03 — TV does not register (Authorization error at 1800)
**Symptom.** New or re-installed TVs fail to register; 1800 → Authorization shows an error although the network has working internet.
**First checks.** Photo of 1800 → Network (does the TV reach the CMS?), the TV model, and whether licences are exhausted.
**Typical cause.** No connection from the TV to the CMS — typically the SSL option in the TV config not matching what the TV model/firmware can do; or no free licence.
**Owner.** Acme Support.
**Fix or answer.** Support changes the SSL option in the config, the hotel reboots the TV; if it still fails, send the model. If Authorization is fine but the room shows no device, it is a licence problem (see T-TV-08).
**Also asked as.** «телевизоры не регистрируются на сервере», «ошибка авторизации в меню 1800», "TVs not registering on the Acme server"
<!-- evidence: FW-189, FW-168 -->

### T-TV-04 — Some TVs do not load while others on the same server do
**Symptom.** A group of rooms on different floors never loads the app; link is up, an IP is assigned, the VLAN on the port is right; the rest of the property works.
**First checks.** When were those TVs last online in the admin panel? From a laptop in one of the rooms: IP in the TV range, ping the server, open its web interface. Is the server reachable over VPN and serving content?
**Typical cause.** Blocking on the hotel network — a port or segment filter between those rooms and the server; the server itself is fine.
**Owner.** Hotel IT / network contractor.
**Fix or answer.** Report the laptop result ("gets an IP, cannot ping the server, web UI unreachable") together with the fact that other TVs work, and ask the hotel to check the network for blocks; nothing to change on the server.
**Also asked as.** «телевизоры в части номеров не видят сервер», «ТВ не загружается на двух этажах», "TVs in some rooms cannot see the server"
<!-- evidence: FW-236, FW-082, FW-120 -->

### T-TV-05 — App takes about 30 seconds to appear after power-on
**Symptom.** Guests complain the TV takes too long to start; the Acme app appears roughly half a minute after the power button.
**First checks.** Ask for a video from the moment of power-on and separate the TV's own start from the app load (in the reference case the app needed about 14 s; the rest was the set booting).
**Typical cause.** The TV boots from full standby; Virtual Standby is off.
**Owner.** Hotel (it is a TV setting). Acme Support advises.
**Fix or answer.** Set Virtual Standby ON in the LG service menu (Mute → 1 → 1 → 9 → OK). For at least some models this cannot be applied to the whole fleet remotely — it is done per TV in the room; say so before the hotel asks.
**Also asked as.** «долгая загрузка приложения при включении ТВ», «телевизор долго включается», "slow boot", "TV takes 30 seconds to start"
<!-- evidence: FW-049 -->

### T-TV-06 — TV does not turn on at check-in
**Symptom.** Check-in is done in the PMS but the TV in the room stays off (or turns on late) while other rooms behave.
**First checks.** Room and the times of check-in and of discovery (Q-004). Logs: was the event sent? Test check-in in that room from our side. Is Wake-on-LAN enabled on the TV and allowed on the network? TV model and firmware (1800 → Device).
**Typical cause.** The set ignored the power-on command and WOL: outdated firmware or a hardware state; a cloud/connectivity problem when many rooms fail at once.
**Owner.** Hotel (TV firmware, WOL, power); Acme Support verifies commands and logs.
**Fix or answer.** Power-cycle the affected set, keep WOL enabled, update the TV firmware with the file and instructions we send. Explain the boundary: our software is an application on the TV; a set that does not react to WOL cannot be switched on by us. Close with "re-open with room and times if it recurs".
**Also asked as.** «ТВ не включается при заселении», «не отрабатывает автоматическое включение», "TV does not power on after check-in", "WOL not working"
<!-- evidence: FW-060, FW-013 -->

### T-TV-07 — Previous guest's name or accounts survive check-out
**Symptom.** After a new check-in the TV still shows the previous surname, or YouTube/other accounts are still signed in; sometimes the TV was not reset at all.
**First checks.** Was a PMS check-out actually sent? Look for records pending "Checked Out" in the admin panel. Does the TV reset after a test check-in/check-out? TV model.
**Typical cause.** No PMS check-out → no reset command was ever sent. Less often a check-out command that did not reach the TV, or a model-specific bug (a Samsung HG-range case is with R&D).
**Owner.** Hotel/PMS for missing check-outs; Acme Support for bulk clean-up and the auto-check-out option; R&D for a model bug.
**Fix or answer.** Treat as E-002 (data protection). The hotel checks the old guests out (PMS or admin panel), the TV reboots, accounts clear. Support can run an automatic check-out of the pending records and enable auto-check-out N hours after the planned departure. For a suspected model bug R&D wants a video of check-in → YouTube login → check-out → automatic reboot, plus TV logs.
**Also asked as.** «не очищаются учётные данные YouTube после выезда», «отображается имя предыдущего гостя», "YouTube credentials not cleared after checkout", "TV not reset after check-out"
<!-- evidence: FW-157, FW-132, FW-013 -->

### T-TV-08 — Welcome screen says "Guest" instead of the name
**Symptom.** PMS data is correct in the admin panel, but the TV greets "Guest"; Connected devices shows the room with no model or MAC.
**First checks.** 1800 → Network and Authorization photos; licences purchased versus in use; devices that have not been online for a very long time.
**Typical cause.** Licences exhausted, so the TV cannot authorise — the room exists but holds no device. After a server restart it can also be stale guest data on the server.
**Owner.** Acme Support (free/adjust licences, repair server data); account manager for additional licences.
**Fix or answer.** Remove long-unused and test devices, reboot the TV, confirm the name appears. If more TVs are genuinely needed, the partner buys licences ([Licensing and Commercial Requests](Licensing-and-Commercial-Requests)).
**Also asked as.** «на ТВ показывает Guest вместо имени гостя», «не обновляется информация о заселённом госте», "welcome page shows Guest", "guest info missing on TV"
<!-- evidence: FW-168, FW-156 -->

### T-TV-09 — Content does not update on the TV
**Symptom.** Changes published hours ago are not on the TVs; a deleted section still shows; the change appears in the guest app but not on the TV; an uploaded image is "gone" after publishing.
**First checks.** Was Publish pressed, and did it succeed (cloud incident at the time)? Is the section in Menu Builder? Do the item's device types include TV? Which panel was used — publish from the main panel. Code 100 / power cycle done? Cover image changed in the right CMS place?
**Typical cause.** Missing Menu Builder entry, wrong device type, publishing from the wrong panel during the migration, a cloud incident, or a cache not refreshed.
**Owner.** Acme Support (re-publish, fix the content script); content managers for content edits.
**Fix or answer.** Add the section / fix the item, publish from the main panel, code 100 or reboot. If the platform side failed, support re-publishes and says so; if the partner also cannot open the admin URL, test over mobile data without VPN ([Admin Panel and CMS](Admin-Panel-and-CMS)).
**Also asked as.** «контент не обновляется на ТВ», «изменения не появляются на экранах», "changes not applied after publishing", "room photos not updated"
<!-- evidence: FW-182, FW-050, FW-109, FW-160, FW-067 -->

### T-TV-10 — Channel opens in a small window; Languages says "Data Unavailable"
**Symptom.** The first selection of a channel plays in a small window and the second attempt is full screen; the blue-button Languages option in the single-programme view returns "Data Unavailable".
**First checks.** App version at 1800 → Device; whether the partner's other properties run the same build.
**Typical cause.** Old TV app version (legacy 1.13-era builds); diagnostics must be done on the current version.
**Owner.** Acme Support (update); R&D if it persists on the current build.
**Fix or answer.** Plan the app update (cloud deployment: R&D coordination, up to 1 hour downtime, window agreed with the hotel); TVs pick it up after a reboot — verify the version at 1800 before re-testing. The same defect at several properties is E-008 (product bug), but do not call it a known bug until R&D confirms.
**Also asked as.** «канал открывается в маленьком окне», «Data Unavailable при выборе языка», "video opens in small window on first launch"
<!-- evidence: FW-010 -->

### T-TV-11 — YouTube / Netflix "app not supported", freezing, or missing
**Symptom.** "App not supported" on YouTube/Netflix; YouTube freezes on all LG sets; Netflix errors on a test room; the app is not on the TV at all.
**First checks.** Exact TV model and firmware (1800 → Device / Connected devices); device type (TV vs TVIP box); 1169 logs after reproducing; was Netflix enabled in the source settings and published?
**Typical cause.** Outdated TV firmware ("not supported"); an unsupported model (TVIP has no Netflix; old LG LX sets are not guaranteed even on the latest firmware); the app simply not enabled.
**Owner.** Hotel for firmware; Acme Support for enabling apps and scheduling; the manufacturer's limits are final.
**Fix or answer.** Firmware update (LG: reboot with standby enabled so the set requests the service files) with the app update alongside; enable Netflix in the source settings and publish. On unsupported models say so plainly — for Philips, HFL6014U and HFL7111T support Netflix.
**Also asked as.** «приложение не поддерживается», «зависает YouTube на LG», «ошибка при запуске Netflix», "YouTube freezing", "enable Netflix for the property"
<!-- evidence: FW-198, FW-011, FW-230, FW-243 -->

### T-TV-12 — 8-digit password prompt after cloning
**Symptom.** After cloning, a TV shows an 8-digit password pop-up; the remote works until the prompt appears, then nothing responds.
**First checks.** Model, which clone file, and whether the prompt returns after Mute → 1 → 1 → 9 → OK.
**Typical cause.** A password carried in the clone file / hotel-mode configuration.
**Owner.** Acme Support (clone file check in the lab); the hotel enters the code on site.
**Fix or answer.** Enter all zeros; if the remote is dead, plug a USB keyboard into the TV and type it. If the prompt keeps returning from the service menu, ask for the clone file and check it in the lab.
**Also asked as.** «запрос 8-значного пароля после клонирования», «пульт не реагирует на окне пароля», "password prompt after cloning"
<!-- evidence: FW-034 -->

### T-TV-13 — Smart TV apps ("Applications") section missing on one TV
**Symptom.** The Applications section shows on all TVs except one, although the room is in the Display Group and the set was re-flashed.
**First checks.** New or old TV? Model; 1800 → Network and Authorization photos; which room the TV is actually registered under in the admin panel (look for a near-duplicate with an extra digit); free licences.
**Typical cause.** The TV is registered under a wrong room number and is therefore outside the Display Group — or it never authorised because licences ran out.
**Owner.** Acme Support.
**Fix or answer.** On the TV enter 1105 and register again under the correct room; free a licence if needed; the section appears at once.
**Also asked as.** «не появляется раздел Приложения на ТВ», "Smart TV apps section missing"
<!-- evidence: FW-163 -->

### T-TV-14 — Remote stops responding on the welcome screen
**Symptom.** The TV boots to the welcome/guest-portal screen; the TV's LED reacts to the remote but the app ignores every key.
**First checks.** Power the TV off for about a minute and on again. If it repeats: 1173 (or 1169) and photograph the yellow/red log lines; model and app version; is it a freshly installed set?
**Typical cause.** App hang at first start, typically on a set the hotel installed itself by the standard instruction; on a cloned set an 8-digit password prompt looks similar (T-TV-12).
**Owner.** Acme Support / R&D with logs.
**Fix or answer.** Power cycle first; collect logs on the second occurrence; check the installation against the standard instruction before going further.
**Also asked as.** «телевизор не реагирует на пульт на приветственном экране», "remote does not work on welcome screen"
<!-- evidence: FW-144, FW-034 -->

### T-TV-15 — Channels stop and the TV returns to the welcome screen
**Symptom.** While watching a channel, playback stops and the TV drops back to the welcome/home screen; several rooms on different floors.
**First checks.** All channels or some? Example room, a short video; TV models and firmware (1800 → Device).
**Typical cause.** Severely outdated TV firmware (seen on Samsung HG AC690 and AU800/Q60A sets); the app (middleware) version comes second.
**Owner.** Hotel applies the firmware; Acme Support supplies the packages from our file server and updates the app afterwards if still needed.
**Fix or answer.** Firmware first, per model, then the TV app if the symptom survives. Make clear "outdated firmware" means the TVs, not the server.
**Also asked as.** «канал вылетает на главный экран», «ТВ возвращается на приветственный экран», "channels stop and return to home screen"
<!-- evidence: FW-234 -->

### T-TV-16 — Weather page empty on a set-top box
**Symptom.** On a set-top box the weather icon is empty at power-on and fills in after roughly five minutes; the date may look wrong; TVs on the same server are fine.
**First checks.** Device type (STB vs TV), which server port the box points to, a video of power-on.
**Typical cause.** Weather data synchronisation on the STB build — with R&D.
**Owner.** R&D.
**Fix or answer.** Forward with the evidence; when a fix is deployed ask the partner to re-test on the same server port and confirm in the ticket. Keep both the hotel's and the partner's references in one thread. See [Known Issues and Release Notes](Known-Issues-and-Release-Notes).
**Also asked as.** «пустая погода на приставке», «неверная дата на странице погоды», "weather icon empty on STB"
<!-- evidence: FW-072 -->

### T-TV-17 — Images look colour-distorted or grey on the TV
**Symptom.** A photo uploaded to a Special offers card (or another section) changes colour or turns grey on the TV.
**First checks.** Which panel was used (old/new); ask for the original files; does it survive code 100 / a reboot?
**Typical cause.** Image format or colour profile not handled on the TV; a stale cached copy.
**Owner.** Acme Support (re-upload, check the format).
**Fix or answer.** Re-upload the originals ourselves, publish, refresh with code 100 or a reboot; if it survives, send the originals to R&D. Supported image formats are listed in [Admin Panel and CMS](Admin-Panel-and-CMS).
**Also asked as.** «искажение цвета изображений на ТВ», «картинки выводятся серыми», "images displayed grey on TV"
<!-- evidence: FW-004 -->

### T-TV-18 — Mass black screens or errors after a storm, power event or gateway reboot
**Symptom.** After a thunderstorm, a power outage or a MikroTik/switch reboot, many TVs show an error or a black screen; some come back after several power cycles.
**First checks.** Q-006 what happened; server state and DHCP; the IP failing TVs get; which network devices were rebooted or replaced; photos of the error.
**Typical cause.** The TV cannot reach the server on its internal address — network equipment or DHCP not back in the right state, or the server itself damaged by the outage; LG sets in particular may need a power cycle after a network interruption.
**Owner.** Hotel IT (network/power); Acme Support for the server.
**Fix or answer.** Laptop-on-the-same-cable test, check the IP range and open the server address; power-cycle sets that did not recover; if the server itself was hit, continue with T-TV-02.
**Also asked as.** «после грозы телевизоры выдают ошибку», «после перезагрузки Mikrotik телевизоры не вернулись в сеть», "TVs black after power outage"
<!-- evidence: FW-226, FW-082, FW-130 -->
