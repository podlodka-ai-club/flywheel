<!-- meta
id: confusable-symptoms
type: decision
audience: support
tags: [confusable, symptoms, diagnosis, wifi login, black screen, content not updating, guest name, casting busy, admin login, overdue emails, notifications, update, disconnected, order stuck]
-->

# Confusable Symptoms

**Read this when:** a reporter's one-line description fits several unrelated causes and you need the single check that tells them apart before you answer or escalate.

---

## 1. How to use this page

Each X- entry is one symptom as reporters phrase it, the causes that hide behind it, and the one check that separates them. Run that check before asking the partner for anything else; the intake gates on [Ticket Intake Checklist](Ticket-Intake-Checklist) (which property, which surface, what scope, one concrete example) still apply. Where a branch ends with another team, route it per [Escalate or Answer](Escalate-or-Answer). Scope decides severity, not the wording of the report.

## 2. Guest Wi-Fi

### X-001 — Room number + last name rejected on the Wi-Fi portal
**Symptom.** "Guests cannot log in with room and surname", "wrong login information".
**Diverging causes.** (a) The attempt was made before the PMS check-in reached us — not a fault. (b) PMS sync is down: the CMS shows no checked-in guests, typically because the TV server is unreachable or offline. (c) The surname is stored differently from what the guest types (transliteration, gendered ending).
**The one check.** Open the property's Guest list in the admin panel for the reported room. Guest present and the check-in time is later than the failed attempts → (a). No checked-in guests at all, or the interface shows disconnected → (b). Guest present under a different spelling → (c).
**Resolves to.** (a) ask the guest to retry now. (b) restart the PMS interface or restore server connectivity — [PMS Integration](PMS-Integration), [Remote Access and Connectivity](Remote-Access-and-Connectivity). (c) give the exact spelling; the predictive login forgives one wrong character only.
**Also asked as.** «не работает авторизация по фамилии», «гость не проходит авторизацию в Wi-Fi», "portal shows incorrect information".
<!-- evidence: FW-187, FW-031, FW-205, FW-174, FW-206 -->

### X-002 — "Wi-Fi does not work" in a room, on a floor, or for everyone
**Symptom.** Devices join the SSID but show "no internet", the portal never appears, or a room complains while the lobby works.
**Diverging causes.** (a) DHCP pool exhausted — devices get no IP at all, property-wide. (b) One access point or its switch port (VLAN, access list) — a room or a cluster of rooms. (c) The authentication path (PMS sync, expired voucher, unreachable server) — devices get an IP and reach the portal but cannot pass it.
**The one check.** Ask whether the phone received an IP address and whether the portal page opened. No IP → (a): the HSIA team widens the pool (e.g. to /20); the work touches connected users, so someone on site verifies. Only some rooms fail → (b): reboot the nearest AP and check its port (the AP name usually carries the switch/port comment). IP and portal, login fails → (c) → X-001, or issue a new voucher.
**Resolves to.** (a) HSIA team. (b) hotel IT or the network contractor, with a person on site near the AP while the HSIA engineer watches the controller. (c) X-001.
**Also asked as.** «не работает Wi-Fi в номере», «устройства не получают IP», «сеть без интернета».
<!-- evidence: FW-171, FW-018, FW-027, FW-206 -->

## 3. Acme TV

### X-003 — Black screen or "no connection" when the TV starts
**Symptom.** TVs boot to a black screen or a "no connection to server" message instead of the interactive menu.
**Diverging causes.** (a) Network: no IP from the TV range, or the server address unreachable from that port (after network work, a storm, mixed VLANs). (b) The TV server is down (power supply, disk, service). (c) Slow boot, not no boot — TVs waited minutes for blocked external addresses (fixed in code). (d) Licences exhausted — the TV cannot authorise; the welcome screen shows "Guest".
**The one check.** Admin panel first: server reachable, TVs online? Server unreachable → (b). Reported TVs offline → 1800 → Network on one TV, or plug a laptop into the TV's cable and open the server address → (a). TVs online, only slow → (c). TV online, room shows no model/MAC → (d).
**Resolves to.** (a) hotel IT. (b) reboot, BusyBox/initramfs recovery, disk replacement — [Updates, Maintenance and Change Control](Updates-Maintenance-and-Change-Control). (c) TV app update / R&D. (d) free licences or buy more — [Licensing and Commercial Requests](Licensing-and-Commercial-Requests).
**Also asked as.** «чёрный экран вместо меню», «ТВ не видит сервер», «нет соединения с меню».
<!-- evidence: FW-120, FW-226, FW-087, FW-168 -->

### X-004 — Content changed in the admin panel, TV still shows the old version
**Symptom.** "Content not updating": a deleted section still on the welcome page, a new channel or video missing after Publish.
**Diverging causes.** (a) Not published where it matters: the section is missing in Menu Builder, the item lacks the TV device type, or the editor works in the wrong regional panel. (b) Publish accepted but not propagated — cloud infrastructure incident. (c) Cache: propagation takes up to ~20 minutes; force it with code 100 or a power cycle.
**The one check.** Open the property in the correct regional panel and compare preview and Menu Builder with the TV. Change absent or section missing → (a). Present in preview, TV still old after code 100 plus 20 minutes → (b): check for an incident, publish manually from the main panel. Present, nobody rebooted a TV → (c).
**Resolves to.** (a) fix in the CMS and publish — [Admin Panel and CMS](Admin-Panel-and-CMS). (b) wait for recovery, republish. (c) reboot one TV to confirm, let the rest propagate.
**Also asked as.** «контент не обновляется на ТВ», «изменения не появились на экранах», "channel not showing after publish".
<!-- evidence: FW-182, FW-041, FW-109, FW-214, FW-050 -->

### X-005 — Content shows on one surface but not on another
**Symptom.** A tile errors in the Guest App while it works on the TV; categories show on TV but not in the app; a section exists on tablets only.
**Diverging causes.** (a) Device types: every content item carries TV / WEB / GUESTAPP flags; a missing flag hides or breaks the item on that surface. (b) The native app lags the web app — a fix shipped, the store release is pending. (c) The partner edits in a regional panel that is not the property's, so nothing they see matches the devices.
**The one check.** Open the item and read its device types. Flag missing → (a). Flags right, web app fine, native app wrong → (b). Item not found at all → (c).
**Resolves to.** (a) add the device types, publish. (b) tell the customer store updates take time; no date. (c) regional URLs on [Admin Panel and CMS](Admin-Panel-and-CMS).
**Also asked as.** «плитка не открывается в приложении», «категории не отображаются в мобильном приложении», "works on TV but not in the app".
<!-- evidence: FW-165, FW-043, FW-162, FW-076 -->

### X-006 — Welcome screen says "Dear Guest" instead of the surname
**Symptom.** The guest is checked in and the admin panel shows the reservation, but the TV greets "Guest" or shows the room only.
**Diverging causes.** (a) The TV could not authorise because licences are exhausted: the room exists under Connected devices, but the device line is empty (no model, no MAC). (b) The PMS interface lost state after a power cut or VM restart; restarting the FIAS interface alone may not be enough. (c) Check-in transfer delayed by a cloud incident (3–5 hour estimates) — the guest is missing from the Guest list too.
**The one check.** Admin panel → Connected devices for that room. Empty device line → (a). Device present, guest missing or late in the Guest list → (b) or (c): ask whether other rooms are affected and whether the server restarted.
**Resolves to.** (a) free or buy licences, reboot the TV — it registers and the name appears. (b) server-side fix by support; ask for 1800 Network and Authorization photos if it persists. (c) incident — [Known Issues and Release Notes](Known-Issues-and-Release-Notes).
**Also asked as.** «на ТВ не отображается фамилия гостя», «приветствие Guest вместо имени», "guest info missing on room TVs".
<!-- evidence: FW-168, FW-156, FW-020, FW-046 -->

### X-007 — Previous guest still visible to the next guest
**Symptom.** YouTube or other accounts remain signed in after departure; the previous guest's name greets the new arrival; the TV did not switch off at check-out.
**Diverging causes.** (a) No PMS check-out ever reached us — the old reservation is still checked in, so no reset command was sent; typical when many records sit in the "checked out" warning state. (b) The check-out arrived and the reset ran, but the TV model does not clear app credentials — a firmware-level defect on specific models (Samsung HG AU800/BU800/U800F reported). (c) The TV did not execute the command — off at the wall or not answering Wake-on-LAN.
**The one check.** Guest list for the room. Previous guest still checked in → (a). Checked out on time, TV rebooted, credentials remain → (b). Checked out, but the TV was unreachable at that moment → (c).
**Resolves to.** (a) hotel checks the guests out in the PMS or admin panel; support can run a bulk check-out and enable auto-check-out N hours after the planned departure. (b) R&D with video and TV logs; handle as E-002. (c) [Acme TV](Acme-TV) power path (WOL, Virtual Standby, firmware).
**Also asked as.** «не сбрасывается YouTube после выезда», «остался предыдущий гость», "TV was not reset at all".
<!-- evidence: FW-157, FW-132, FW-013 -->

### X-008 — TV does not turn on at check-in
**Symptom.** Check-ins register, but the TV in some rooms stays off.
**Diverging causes.** (a) One set is in a state where it ignores the power-on command and the Wake-on-LAN fallback — old firmware or a hung TV; usually one or two out of several tested. (b) A property-level configuration problem — every room affected; a small configuration change on our side fixes it. (c) WOL packets are not allowed on the hotel network.
**The one check.** Do a test check-in on one reported room from the admin panel and read the log. Event sent and the TV turns on → the reported case was (a) for that set; ask for room and time of the next failure. Event sent, no TV in any room reacts → (b) or (c).
**Resolves to.** (a) power cycle, check WOL is enabled on the set, update its firmware (Philips example on Updates-Maintenance-and-Change-Control). (b) support corrects the property configuration. (c) hotel IT permits WOL in the TV VLAN.
**Also asked as.** «ТВ не включается при заселении», "WOL not working", "TVs don't switch on / off at check-out".
<!-- evidence: FW-060, FW-013 -->

## 4. Casting

### X-009 — Casting says "All devices busy" or "service unavailable"
**Symptom.** The QR code scans, then the TV shows "All devices busy, please try again later" although nobody is casting.
**Diverging causes.** (a) AcmeStream (or the Apple service) is in an error state — a restart helps for a while; the real fix is the stream-service upgrade and, on legacy installs, removing the session controllers. (b) The Chromecasts are physically off — session controllers cut their power and they have to be switched on by hand, so the pool of free devices is empty.
**The one check.** Compare the number of Chromecasts in an active state in the service configuration with what the hotel sees powered on. Devices active in the config, error persists → (a). Most devices off → (b).
**Resolves to.** (a) restart now, schedule the upgrade (≈1.5 h, static IPs for the Chromecasts) — [Casting, Chromecast and AirPlay](Casting-Chromecast-and-AirPlay). (b) hotel powers the devices on; plan the upgrade that removes the controllers. Hide the AppleTV tab on request while the Apple service is broken.
**Also asked as.** «все устройства заняты», «AppleTV не работает», «кастинг не работает», "Air Stream busy".
<!-- evidence: FW-014, FW-015, FW-199, FW-002 -->

### X-010 — Casting connects, sound plays, no picture
**Symptom.** The phone says connected; the TV stays black, or audio arrives without video.
**Diverging causes.** (a) One Chromecast produces no multicast stream — unplugged from the encoder, or it needs a reboot. (b) Every room fails — the encoder, its HDMI inputs and cables, or the multicast path from the streamer to the TVs.
**The one check.** Scope first: one room or all? Then look for the stream on that Chromecast's multicast address (from the streamer, or VLC in the TV VLAN). One device silent → (a). Nothing from any device → (b).
**Resolves to.** (a) reconnect and reboot the device; as a workaround take it out of the rotation (its identifier changing between sessions is expected). (b) reboot the encoder, swap HDMI ports and cables, connect a laptop with AnyDesk to the encoder for us — [TV Channels and Video Streaming](TV-Channels-and-Video-Streaming).
**Also asked as.** «звук есть, картинки нет», «чёрный экран при трансляции с телефона», "cast shows black screen".
<!-- evidence: FW-052, FW-017 -->

## 5. Orders and notifications

### X-011 — Overdue-order e-mails keep arriving
**Symptom.** Staff say they accepted the order but "late order" reminders continue; the guest side shows the order in red.
**Diverging causes.** (a) By design: reminders repeat until the order is Confirmed and then Completed; a confirmed but not completed order still reminds. (b) Statuses never reach us: the order tool or POS sends its status callbacks to the wrong regional API domain (Russian domain for hotels in Russia, international elsewhere). (c) The staff account lacks the right to change status, so the click does nothing.
**The one check.** Open one reported order in the admin panel and read its status. Confirmed, not Completed → (a). Still New although staff "accepted" it in their tool → (b): ask which callback domain the integration uses. Staff cannot change status in our panel at all → (c): ask for the logins used and a short video.
**Resolves to.** (a) explain; configurable notification settings are planned, no date. (b) the integrator switches the callback domain. (c) fix the user's role and services in the new admin panel.
**Also asked as.** «приходят уведомления о задержке заказа», «статусы заказов не обновляются», "overdue notifications after confirmation".
<!-- evidence: FW-016, FW-196, FW-043 -->

### X-012 — "We get no notification e-mails"
**Symptom.** Staff say order or guest-message alerts do not arrive, or arrive without sound.
**Diverging causes.** (a) Delivered but filtered — Mailgun shows "Delivered" and the mail sits in spam. (b) The user is not subscribed — the service (e.g. In-Room Dining) is not ticked in the user profile, or notification filtering excludes it; such users also do not see the orders in their list. (c) The alert arrived but the browser played no sound — tab muted, site not allowed to play audio, wrong output device, a blocking extension.
**The one check.** Take one concrete example (date, time, user) and look it up in Mailgun. Delivered → (a), or (c) if the complaint is about sound. Never sent to that address → (b).
**Resolves to.** (a) spam filter / whitelisting on the hotel mail side. (b) Staff list → Edit user → Notification page, plus the services in the profile; re-login. (c) browser and OS settings — not ours.
**Also asked as.** «не приходят уведомления о заказах», «письма о заказах не приходят», "notifications arrive without sound".
<!-- evidence: FW-053, FW-038, FW-225, FW-237 -->

### X-013 — Order stuck in New
**Symptom.** The order is New on our side while the guest already received it, or the task tracker shows it Completed.
**Diverging causes.** (a) A short outage: the hand-over task to the tracker finished with an error and the tracker's status never came back — only our status is wrong. (b) Nobody processed it: the order was never accepted in the admin panel or Staff app, so it stays New and generates overdue reminders.
**The one check.** Compare our status with the tracker's (or the staff's own record) for the same order. Tracker Completed, ours New → (a). No trace of anyone handling it → (b).
**Resolves to.** (a) support completes it manually and logs it for R&D (a permanent fix is in progress). (b) staff must Confirm and Complete — [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App).
**Also asked as.** «заказ висит в статусе New», «заказ не обработан», "order stuck in New status".
<!-- evidence: FW-065, FW-196 -->

## 6. Admin panel and tablets

### X-014 — Cannot log into the admin panel
**Symptom.** Credentials rejected, an endless spinner, a white screen, or "Something goes wrong!".
**Diverging causes.** (a) Wrong regional panel (EU, NA, RU); a first login after a region transfer can take 5–10 minutes. (b) Wrong login option — option 1 is login/password, option 2 is SSO. (c) Cookies disabled in the browser. (d) The hotel network or ISP blocks the panel URL — mobile data works. (e) Cloud incident — both panels down for everyone.
**The one check.** Ask for a full screenshot with the address bar and the error, plus one attempt over mobile data with VPN off. Region in the URL differs from the account's → (a). Page loads, wrong option → (b). Cookie error → (c). Mobile data works, hotel network not → (d). Everyone, everywhere → (e).
**Resolves to.** (a) give the regional URL. (b) reset the password (link valid 60 minutes) and use option 1, or SSO. (c) enable cookies. (d) hotel IT whitelists; use the other panel meanwhile. (e) [Known Issues and Release Notes](Known-Issues-and-Release-Notes).
**Also asked as.** «не могу зайти в админку», «нет доступа к админ-панели», "cannot log in with existing credentials".
<!-- evidence: FW-076, FW-169, FW-008, FW-022, FW-041 -->

### X-015 — Check-in popup on one tablet but not the other
**Symptom.** Two tablets in one room; only one shows the check-in / marketing popup about a minute after check-in.
**Diverging causes.** (a) By design: the notification is generated in the cloud with a per-guest "delivered" flag; if only one tablet was online at generation time, only it receives the popup — devices all online at that moment all show it. (b) A real fault: no tablet in the room shows it, or the room is not set on the tablet.
**The one check.** Ask which tablets were online (powered, awake) one minute after check-in. One online → (a). Both online and nothing shown, or neither shows it → (b).
**Resolves to.** (a) explain; not a bug. (b) check the room assignment and the CI status in the CMS; escalate with room and time — [In-Room Tablets and Room Control](In-Room-Tablets-and-Room-Control).
**Also asked as.** «попап заселения показывается не на всех планшетах», "RoomConnect not showing check-in popup".
<!-- evidence: FW-023 -->

## 7. Updates and connectivity

### X-016 — "The TV needs an update" — which one?
**Symptom.** Reporter asks us to "update the TVs" or "update the system" for freezing apps, "app not supported", channels dropping to the welcome screen, or a cosmetic bug.
**Diverging causes.** (a) Acme TV app — functional and cosmetic bugs in our app; updated by us (test folder, then main folder). (b) TV firmware — YouTube/Netflix "not supported", audio, channel playback on old sets; done by the hotel with our files, or scheduled by us with a reboot for LG service files. (c) TV server OS and services — old Ubuntu with an old Apple or stream service.
**The one check.** 1800 → Device (or Connected devices in the admin panel) shows both the app version and the firmware. Old app → (a). Old firmware → (b) first, middleware afterwards if still needed. Server on Ubuntu 18 → (c).
**Resolves to.** [Updates, Maintenance and Change Control](Updates-Maintenance-and-Change-Control) for all three; always agree a window and a person who verifies.
**Also asked as.** «обновите телевизоры», «нужно обновить систему», «обновить прошивку», "update the middleware".
<!-- evidence: FW-010, FW-037, FW-198, FW-234, FW-014 -->

### X-017 — TV app takes long to start
**Symptom.** "The app loads about 30 seconds after power-on."
**Diverging causes.** (a) The TV's own cold boot — most of the wait passes before our app even starts. (b) The app itself loads slowly — network, server, or blocked external addresses (see X-003).
**The one check.** Ask for a video from the power button and note the second at which our app appears versus the second it finishes loading. App appears late → (a). App appears early but loads long → (b).
**Resolves to.** (a) Virtual Standby ON in the hotel-mode service menu (fast boot); mass remote application depends on the model and is often manual. (b) [Acme TV](Acme-TV) diagnostics with the 1169 log.
**Also asked as.** «долгая загрузка приложения на ТВ», «ТВ долго включается», "slow boot".
<!-- evidence: FW-049, FW-120 -->

### X-018 — PMS or HSIA interface shows "disconnected"
**Symptom.** The platform shows the property's interface as disconnected; guests cannot log in with room + surname; check-ins stop arriving.
**Diverging causes.** (a) The hotel side blocks us — the ISP firewall blocks OpenVPN, the TV server lost internet, or a hotel firewall blocks our platform ranges and the link to the PMS provider. (b) Server-side incident — an unattended OS upgrade triggered a Keepalived failover and stopped the service (failover scripts adjusted since). (c) PMS-side: the webhook deactivated, or the PMS API refuses us (HTTP 403 NotWhitelisted).
**The one check.** Can we reach the server over our VPN? No → (a): ask for AnyDesk on a PC in the server's network, check the server's internet access, request whitelisting. Yes, and the service is stopped → (b). Yes, service up, data not arriving → (c).
**Resolves to.** (a) hotel IT — [Remote Access and Connectivity](Remote-Access-and-Connectivity). (b) restart the service; incident note. (c) [PMS Integration](PMS-Integration).
**Also asked as.** «интерфейс не стартует», «нет связи с сервером», «нет синхронизации с PMS», "interface shows disconnected".
<!-- evidence: FW-031, FW-206, FW-070, FW-250, FW-193 -->
