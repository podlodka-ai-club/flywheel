<!-- meta
id: casting-chromecast-and-airplay
type: product
audience: support
tags: [casting, chromecast, airplay, apple tv, air stream, acmestream, session controller, encoder, mikrotik, all devices busy, service unavailable, qr code, bluetooth, cast licence]
-->

# Casting, Chromecast and AirPlay

**Read this when:** a ticket mentions Chromecast, Air Stream, AppleTV/AirPlay, "all devices busy", "service unavailable", a black screen after scanning the QR code, or Bluetooth pairing with the TV.

---

## 1. Architecture

Casting is a service on the TV server plus a rack of Chromecasts (and optionally Apple TV boxes) that the guest never touches directly. Knowing the three links of a session tells you which team owns a fault.

### AcmeStream: QR pairing, rack, encoder, multicast
AcmeStream is our casting service on the TV server. The guest opens the casting item on the TV ("Connect my device" / Air Stream — partners also just say "casting"), sees a QR code, scans it with the phone and is paired with a free Chromecast from a rack in the server room. The phone casts to that Chromecast as if it were in the room; the Chromecast's HDMI output goes into an encoder, and the encoder multicasts picture and sound into the TV network, where the TV app tunes to that stream exactly like a channel. A session therefore has three links that fail separately: the pairing/session (AcmeStream, the MikroTik, the guest Wi-Fi), the device (Chromecast power, HDMI cable, encoder port) and the delivery (multicast from the encoder to the TV). The guest sees tabs such as "Chromecast", "Air Stream" and "AppleTV", and a device name such as "Chromecast 2 TV".
<!-- evidence: FW-015, FW-017, FW-052, FW-014 -->

### Legacy session controllers vs the current version
Older installations pair guests through physical session controllers. They are the weak point: Chromecasts behind them lose power and must be switched on by hand, and "all devices busy" keeps coming back until the service is restarted. The current AcmeStream version removes the session controllers: every Chromecast gets a static IP on the hotel network (the partner assigns them and sends us the MAC/IP list), the MikroTik gateway takes part in the pairing path, and the service maps the IPTV streams to the Chromecast names using the streamer's address. Where a property still has session controllers, every restart request is a reason to propose the upgrade (section 9).
<!-- evidence: FW-015, FW-199 -->

### Apple TV option and cast licences
AirPlay is offered through Apple TV boxes in the rack, driven by an Apple service on the TV server; the guest sees an "AppleTV" tab. The Apple service has to be kept current together with the boxes and the server OS (section 8). Casting is licensed separately from the TV app: Cast licences and TV licences are separate counts, and tablets are counted separately again — so a purchase that raised the TV count in the portal does not raise the Cast count until support applies it. Ask the partner for the Cast count before and after the purchase, apply it after commercial approval, and route the purchase itself through the account manager — see [Licensing and Commercial Requests](Licensing-and-Commercial-Requests).
<!-- evidence: FW-014, FW-204, FW-011 -->

## 2. "All devices busy"

### What "All devices busy, please try again later" means
The service believes every Chromecast (or Apple TV box) is in a session although nobody is connected — a monitor on the box shows it idle, and rebooting the boxes changes nothing. It is a AcmeStream state, not a device fault: stale sessions in the service, typically with session controllers or an outdated service (or an outdated Apple service next to a current TV app). Restarting AcmeStream clears it and casting works "for a while"; the permanent fix is the upgrade — update AcmeStream and the MikroTik and remove the session controllers, or for AppleTV update the server OS, the Apple service and the boxes. Decision rule: first occurrence → restart, say it is temporary; second occurrence → propose the upgrade with a window.
<!-- evidence: FW-014, FW-015, FW-199 -->

## 3. "service unavailable"

### "service unavailable" on the casting item
The casting item on the TV shows "service unavailable": the TV cannot reach AcmeStream at all (service stopped or crashed, or the server unreachable). Check the service on the server — the logs show the error — restart it and ask the hotel to re-test; the reply is short: "service restored, please check on your side". It is a whole-property symptom for the casting function, so answer within the hour. If it recurs, look at the server (uptime, disk, pending updates) instead of restarting a third time.
<!-- evidence: FW-002, FW-190 -->

## 4. Audio but no picture

### Sound on the TV, black picture
The guest pairs successfully and hears the audio, but the TV shows no image: the service assigned a Chromecast whose multicast stream is not arriving. On the server we see no stream from that Chromecast on its multicast address — the device is not delivering to the encoder (HDMI cable, encoder port, a hung Chromecast). Ask the hotel to make sure the device is connected to the encoder and to reboot it (the device first, the encoder if needed; try another HDMI port). Workaround while that happens: remove that Chromecast from the rotation so guests are no longer paired with it — and tell the partner it is a workaround, not a fix.
<!-- evidence: FW-052, FW-017 -->

## 5. Chromecast identifier changes

### "Chromecast 4 TV" became "Chromecast 5 TV"
After a guest disconnects and pairs again, the TV shows a different Chromecast name or number. That is expected: the identifier is the rack device the service assigned for this session, not the room's own device, and it changes between sessions. No action, no ticket to R&D — just explain it.
<!-- evidence: FW-052 -->

## 6. Chromecast audio problems

### Audio artefacts or dropouts while casting
Distorted or dropping audio during a Chromecast session with the picture fine is a TV-side problem. After R&D looked at such cases the two options were restarting the stream service (which does not help when only audio is affected) and updating the TV firmware on all sets: the hotel applies the firmware package and instructions we send (about 5 minutes per TV), then we update the system version remotely and re-test. Check the firmware in Connected devices to confirm the hotel really updated before re-testing. A casting fault open for months, with renewal or recommendation language in the ticket, is E-007 and E-009 in [Escalate or Answer](Escalate-or-Answer).
<!-- evidence: FW-025 -->

## 7. Casting on set-top boxes

### TVIP boxes and the black screen after the QR code
On set-top boxes (TVIP) casting works only through the encoder path: the phone reports "connected" after the QR code, but if the box does not receive the multicast from the encoder the screen stays black — also when casting directly from an app such as YouTube. First: does the server have internet and can we reach it (over VPN, or AnyDesk to a laptop plugged into the TV VLAN)? Then: reboot the encoder; test the HDMI cables and swap encoder ports; a laptop connected to the encoder by cable lets us look at it directly. When all Chromecasts on one encoder fail at once, the encoder or its network leg is the suspect, not the cables. Remote-access options are in [Remote Access and Connectivity](Remote-Access-and-Connectivity).
<!-- evidence: FW-017 -->

## 8. Apple TV service and server OS age

### AppleTV tab broken on an old server
AirPlay relies on the Apple service on the TV server. When the TV app is current but the Apple service and the server OS are old (Ubuntu 18), the AppleTV tab shows "all devices busy" or fails outright. The path: move the server to Ubuntu 24 or newer — an in-place upgrade across several releases is riskier than a fresh VM with the same interfaces (access/internet, TV network, guest Wi-Fi, PMS or a route to it) onto which our engineers migrate the VPN, the PMS interface, Zabbix and the rest; update the Apple service; the hotel updates the Apple TV boxes. If the hotel cannot provide a VM, the in-place upgrade is done with the risks stated and accepted in writing. Hide the AppleTV tab on request while this is pending so guests stop trying.
<!-- evidence: FW-014 -->

## 9. Upgrading the stream service

### How a AcmeStream upgrade runs
Plan about 1.5 hours. From the partner: static IPs for all Chromecasts (MAC/IP list) and any IP whitelisting on their side. From us: the number of devices the service currently sees active, the streamer's address to map IPTV streams to Chromecast names, and a window agreed with the hotel — rising occupancy is a reason to do it sooner, not later. Steps: upgrade the service, add the devices with their addresses (a device whose static IP is still pending is added later), map the streams, then verify casting from a room with someone on site. Afterwards the physical session controllers are no longer needed. Note anything unusual for the partner's next upgrade.
<!-- evidence: FW-199, FW-015 -->

## 10. Bluetooth

### Bluetooth pairing is a TV feature
Bluetooth (headphones, phones) is a feature of the TV set, exposed in the TV's own connections menu; we do not control it and cannot confirm that a given headset will work. Answer: try pairing directly with the TV. For "iPhone cannot pair but Android can": ask whether several iOS devices and several TVs were tried, and — the decisive test — whether it reproduces on a TV without the Acme app installed. Only if it works without the app and fails with it do we take it further.
<!-- evidence: FW-212, FW-044 -->

## 11. Requests we get

### Restart, power on, hide, increase
"Restart the casting service" — done on request, immediately; reply "restarted, please check" and ask for details only if it did not help. "Power on the Chromecasts" — behind session controllers devices lose power; powering them is on-site work, and what we can do is report how many devices the service sees as active. "Hide the AppleTV (or Chromecast) tab" — done in the configuration while a fix is pending. "Increase Cast licences" — after commercial approval support updates the count; confirm the before/after numbers with the partner. An out-of-office auto-reply landing in a casting thread is non-support traffic — close it ([Support Operations](Support-Operations)).
<!-- evidence: FW-190, FW-199, FW-014, FW-204, FW-129 -->

## 12. Triage rows

Each row is self-contained. Always confirm the property (Q-001) and whether it is one room or all rooms (Q-003) before touching the service.

### T-CAST-01 — "All devices busy, please try again later"
**Symptom.** The QR code scans, then the TV or phone says all devices are busy; nobody is casting; rebooting the Chromecasts or Apple TV boxes changes nothing.
**First checks.** Which tab (Chromecast / AppleTV)? Session controllers still installed? AcmeStream and Apple service versions versus the TV app; server OS version; service logs.
**Typical cause.** Stale sessions in an outdated AcmeStream (legacy session controllers) or an outdated Apple service on an old server.
**Owner.** Acme Support (restart, config); deployment/engineering for the upgrade; the hotel updates the Apple TV boxes.
**Fix or answer.** Restart the service now and say it is temporary; propose the upgrade (AcmeStream + MikroTik, remove session controllers — or server OS + Apple service + boxes) with a window. Offer to hide the broken tab meanwhile.
**Also asked as.** «All devices busy», «все устройства заняты», «AppleTV не работает», "Air Stream reports all devices busy"
<!-- evidence: FW-014, FW-015, FW-199 -->

### T-CAST-02 — "service unavailable" when opening casting
**Symptom.** Selecting the casting item on the TV shows "service unavailable" (screenshot usually attached); affects every room.
**First checks.** Is the TV server reachable? Is AcmeStream running? Logs.
**Typical cause.** The casting service is down or crashed.
**Owner.** Acme Support.
**Fix or answer.** Restart the service, confirm, reply "restored, please check". Recurrence → look at the server's health and version.
**Also asked as.** «функция casting выдаёт service unavailable», «кастинг недоступен», "casting shows service unavailable"
<!-- evidence: FW-002, FW-190 -->

### T-CAST-03 — Audio plays but the TV shows no picture
**Symptom.** Pairing works and sound comes out of the TV, but the screen stays black; the device name (for example "Chromecast 2 TV") is known.
**First checks.** On the server: is there a stream from that Chromecast on its multicast address? Is the device connected to the encoder; which HDMI port?
**Typical cause.** That Chromecast is not delivering to the encoder (cable, port, hung device).
**Owner.** Hotel IT for the rack (cable, reboot); Acme Support for the rotation and the check.
**Fix or answer.** Hotel reconnects/reboots the device; meanwhile exclude it from the rotation and say it is a workaround. After the reboot, put it back and re-test.
**Also asked as.** «есть звук, нет изображения при Chromecast», "Chromecast audio works but no video"
<!-- evidence: FW-052 -->

### T-CAST-04 — Black screen after the QR code in all rooms (set-top boxes)
**Symptom.** Phones report "connected" after scanning, but every TV (via TVIP boxes) stays black, also when casting from YouTube directly; it worked on the day of set-up.
**First checks.** Server internet and our access to it; encoder power and HDMI; can we reach the encoder (laptop with AnyDesk on its network)?
**Typical cause.** No multicast from the encoder to the TVs — encoder, its HDMI inputs, or the network leg; new cables all failing at once points to the encoder.
**Owner.** Hotel IT on site for encoder, cables and access; Acme Support for the diagnosis.
**Fix or answer.** Reboot the encoder, test cables and swap ports, then give us a wired laptop on the encoder. A long-open case with rising guest complaints needs a dated plan (E-009).
**Also asked as.** «чёрный экран после сканирования QR», «кастинг через TVIP не работает», "casting black screen on TVIP"
<!-- evidence: FW-017 -->

### T-CAST-05 — One room's TV "cannot connect to Chromecast"
**Symptom.** A single room reports that the TV cannot connect to Chromecast; marked urgent; no error text.
**First checks.** Is the problem still present? On our side, are there active sessions for the service (the service is working)? Which step fails — QR, pairing, picture? Example device and time.
**Typical cause.** A single failed session or guest-side Wi-Fi rather than the service; sometimes the ticket is stale by the time we read it.
**Owner.** Acme Support to confirm the service; hotel for the room.
**Fix or answer.** Reply that the service shows active sessions, ask whether it persists and for the failing step with a photo; if a specific rack device is involved, follow T-CAST-03.
**Also asked as.** «телевизор не подключается к Chromecast», "TV cannot connect to Chromecast"
<!-- evidence: FW-035 -->

### T-CAST-06 — Audio problems while casting (Chromecast)
**Symptom.** Audio distorted or dropping during Chromecast sessions, video fine; often an old, escalated ticket.
**First checks.** TV models and firmware in Connected devices; has the firmware package we sent been applied? Was the stream service already restarted?
**Typical cause.** TV firmware.
**Owner.** Hotel applies the firmware; Acme Support sends the package and instructions, then updates the system version and re-tests.
**Fix or answer.** Resend the firmware file and instructions to the named technical contact, confirm the version in Connected devices afterwards, then update the system remotely and re-test. Commercial-risk language → E-007 (AM + L2).
**Also asked as.** «проблемы со звуком при Chromecast», "Chromecast audio issues"
<!-- evidence: FW-025 -->

### T-CAST-07 — Chromecast number changed between sessions
**Symptom.** The room used to show "Chromecast 4 TV" and now shows "Chromecast 5 TV"; the partner asks whether that is normal.
**First checks.** None needed beyond confirming casting works.
**Typical cause.** Expected behaviour — the service assigns a rack device per session.
**Owner.** Acme Support (explanation only).
**Fix or answer.** Explain; no action.
**Also asked as.** «Chromecast поменял номер», "Chromecast identifier changed"
<!-- evidence: FW-052 -->

### T-CAST-08 — AppleTV tab does not work / hide the AppleTV tab
**Symptom.** The AppleTV option fails ("all devices busy" or similar); the partner asks to hide the tab while it is broken.
**First checks.** Apple service version, server OS version, TV app version; Apple TV box firmware.
**Typical cause.** Outdated Apple service on an old server OS (Ubuntu 18) next to a current TV app.
**Owner.** Acme Support/engineering for service and OS; the hotel for the boxes and, if possible, a VM.
**Fix or answer.** Restart as a stop-gap, hide the tab on request, plan the OS + Apple service + boxes update (fresh VM preferred; in-place with accepted risk otherwise).
**Also asked as.** «не работает AppleTV», «скройте вкладку AppleTV», "hide the AppleTV tab"
<!-- evidence: FW-014 -->

### T-CAST-09 — Chromecasts switched off behind session controllers
**Symptom.** Most Chromecasts appear off; the partner asks us to power them on and to restart the casting service.
**First checks.** Session controllers present? How many devices does the service see active? Is the upgrade already planned?
**Typical cause.** Legacy session controller set-up — devices lose power.
**Owner.** Hotel on site for power; Acme Support for the restart and the upgrade.
**Fix or answer.** Restart the service, report the active-device count, and schedule the AcmeStream upgrade (about 1.5 h, static IPs from the partner) so the controllers can go.
**Also asked as.** «приставки Chromecast выключены», «включите Chromecast», "Chromecasts lose power"
<!-- evidence: FW-199 -->

### T-CAST-10 — Bluetooth pairing fails (iPhone vs Android) or headphones
**Symptom.** iPhones cannot pair with the TVs over Bluetooth while Android phones can; or a guest asks about wireless headphones.
**First checks.** Several iOS devices and several TVs tried? Does it reproduce on a TV without the Acme app? Is Bluetooth in the TV's connections menu?
**Typical cause.** TV Bluetooth implementation — outside our application.
**Owner.** TV manufacturer / hotel; Acme Support only checks the app is not involved.
**Fix or answer.** Try pairing directly with the TV; run the without-app test; we cannot guarantee headphones work. Not a defect of ours unless it fails only with the app installed.
**Also asked as.** «не подключается Bluetooth с iPhone», «можно ли подключить беспроводные наушники», "Bluetooth headphones on the TV"
<!-- evidence: FW-044, FW-212 -->
