<!-- meta
id: ticket-intake-checklist
type: process
audience: support
tags: [intake, checklist, questions, property, scope, example, evidence, screenshot, logs, 1800, 1169, diagnostics, ticket, triage]
-->

# Ticket Intake Checklist

**Read this when:** a new ticket arrives and you need to decide what to ask before anyone can look at it.

---

## 1. Why intake comes first

Tickets without a property, a scope and one concrete example stall. A minibar-posting report needed a "which property?" round-trip before anything could be checked. A HotSOS status error waited through several messages until the team could ask for one order from a real room. A web-form ticket arrived with a title and no description. "Channels stop and return to the welcome screen" could not be worked until an example room, what "home screen" meant and a video were requested. A chat opened with "Support help" and nothing else. Each of these cost a day. The gates below are the questions that prevent it: ask only the one that blocks the next step, and ask it precisely.
<!-- evidence: FW-021, FW-135, FW-181, FW-234, FW-235 -->

## 2. The gates

Each gate is one question. If the answer is already in the subject, the CRM or the attachments, do not ask it. Hard escalation triggers in [Escalate or Answer](Escalate-or-Answer) are checked in parallel — intake never delays a P1.
<!-- evidence: FW-135 -->

### Q-001 — Which property
**What to ask.** "Which property does this concern?" — «Уточните, пожалуйста, о каком объекте (отеле) идёт речь?»
**Why.** Partners manage many properties and write in the plural or by nickname; every check we run — server, CMS, licences, Guest list, logs — is per property, and a fix applied to the wrong one is worse than no fix. When two properties of one partner are affected, both must be named so both get done. Read the subject and the CRM first: asking for what is already written irritates the partner.
<!-- evidence: FW-021, FW-135, FW-157, FW-054 -->

### Q-002 — Which surface
**What to ask.** "Where exactly do you see this — on the TV, in the web app, in the native mobile app, on the in-room tablet, in Acme Staff, in the old or the new admin panel, in the HSIA portal, or in HotSign?" — «Где именно это наблюдается: на ТВ, в веб-приложении, в мобильном приложении, на планшете, в приложении Acme Staff, в старой или новой админ-панели, в портале HSIA или в HotSign?»
**Why.** The same symptom has different owners per surface: an order that behaves differently in the old and the new admin panel, a menu that misbehaves in the WebApp but not on the TV, a "TV" problem that is really the middleware or the tablet. The surface decides which version to check and which logs to ask for.
<!-- evidence: FW-036, FW-056, FW-008, FW-234 -->

### Q-003 — Scope: one room, several, or the whole property
**What to ask.** "Is it one room, several rooms, or the whole property?" — «Проблема в одном номере, в нескольких или по всему отелю?»
**Why.** This gate sets severity. "The whole TV system is down" and "one TV in one room" start different procedures: whole-property is a P1 trigger (server, network segment, gateway); a single room is a device, a port or a cable. Ask for the count and whether the affected rooms share a floor, a switch or a TV model — that pattern is the first diagnostic.
<!-- evidence: FW-032, FW-082, FW-234, FW-241 -->

### Q-004 — A concrete example
**What to ask.** "Give one concrete example: room number, date and time, guest surname or order number." — «Приведите, пожалуйста, один конкретный пример: номер комнаты, дата и время, фамилия гостя или номер заказа.»
**Why.** Logs, the Guest list, Mailgun delivery status and integration queues are searched by room, time and identifier. "Notifications sometimes do not arrive" cannot be checked; "this room, this time, this order number" can. For login failures the time matters most: attempts before the PMS check-in are expected to fail. For lock audits the exact time is needed to match the event in the log.
<!-- evidence: FW-053, FW-135, FW-187, FW-055 -->

### Q-005 — Evidence
**What to ask.** "Please send a screenshot with the address bar and the error text, or a photo/video. On a TV, press 1800 on the remote from the main menu and photograph Network, Device and Authorization; then reproduce the problem, press 1169 and photograph the log." — «Пришлите, пожалуйста, скриншот с адресной строкой и текстом ошибки или фото/видео. На ТВ наберите на пульте 1800 в главном меню и сфотографируйте разделы Network, Device и Authorization; затем воспроизведите проблему, наберите 1169 и сфотографируйте лог.»
**Why.** 1800 shows which server the TV talks to, its IP, the app version and whether it is authorised; 1169 (1173 on some builds) shows the yellow and red log lines. A screenshot with the address bar tells us the region and the panel. A video settles "what exactly happens" in one step. Ask for the full set once, not piecemeal.
<!-- evidence: FW-032, FW-168, FW-230, FW-144 -->

### Q-006 — What changed
**What to ask.** "What changed before it started — an update, a power outage, network changes, new devices, PMS changes?" — «Что менялось перед тем, как это началось: обновление, отключение электричества, изменения в сети, новые устройства, изменения в PMS?»
**Why.** Most faults follow a change: YouTube trouble after a TV update, BSP control lost after a CMS change, add-on prices wrong since another application was updated, a server that will not boot after a power-supply failure, order statuses failing since the integration's callback domain was set. "Since when" plus "what changed" often names the cause before any log is read.
<!-- evidence: FW-011, FW-188, FW-245, FW-087, FW-196 -->

### Q-007 — Access and hands
**What to ask.** "Do we have remote access (VPN or AnyDesk), and is there someone on site who can test in a room?" — «Есть ли у нас удалённый доступ (VPN или AnyDesk) и есть ли на объекте сотрудник, который может проверить в номере?»
**Why.** When the TV server is unreachable we need a PC with AnyDesk in the server's network; when an access point misbehaves the HSIA engineer needs a phone at that point while watching the controller; an update needs someone to check one test TV first. Knowing the access path and the on-site person up front avoids a day of "please be available".
<!-- evidence: FW-009, FW-031, FW-027, FW-047 -->

### Q-008 — Which region/URL and which login option
**What to ask.** "Which admin panel address do you use (EU, NA, RU or the local link) and how do you log in — login and password, or SSO?" — «Каким адресом админ-панели вы пользуетесь (EU, NA, RU или локальная ссылка) и как входите: по логину и паролю или через SSO?»
**Why.** Two panels (old and new) and three regions coexist; an account works on one and not the other, SSO users differ from password users, and integrations must point at the regional API domain (the Russian domain for hotels in Russia, the international one elsewhere). Acme Staff has a server choice at login too. Half of "cannot log in" is answered by this gate.
<!-- evidence: FW-008, FW-196, FW-085, FW-188 -->

## 3. Standard diagnostic asks per surface

Once the gates are answered, ask the surface-specific set in one message.

### TV (Acme TV)

Room number and TV model; photos of 1800 → Network, Device and Authorization (the app version and the firmware are on Device); after reproducing, 1169 (1173 on some builds) — photograph the yellow and red lines; a short video; whether a power cycle changes anything; which IP the TV receives when a whole segment is affected. If 1800 does not open from the main menu, the red button from the TV mosaic opens the diagnostic page. Firmware can also be read in the admin panel under Connected devices.
<!-- evidence: FW-032, FW-168, FW-010, FW-061, FW-144 -->

### Tablet (BSP/RoomConnect)

Room status not "Room not set" (a vacant test tablet is fine, but say so); APK version; 1800 by tapping the room number repeatedly until the popup appears; whether other tablets behave the same; for TV-control loss, reboot the TV and then the tablet before reporting; for external links or PDF buttons failing, the tablet model — webview firmware bugs are a known cause. Test orders come from a tablet or TV in a vacant room, not from a browser.
<!-- evidence: FW-054, FW-048, FW-073, FW-188, FW-030 -->

### Guest App (WebApp and native app)

Web app or native app, and for native which store and which region was chosen at login; phone model and OS; a screenshot with the URL visible; whether the same happens in a private/incognito window or on another phone; the item, section and price seen versus configured; whether the TV shows the same for the same order.
<!-- evidence: FW-036, FW-245, FW-056 -->

### Guest Wi-Fi (HSIA)

Room number or the device MAC; login method (PMS room number + surname, voucher, SMS, MAC whitelist, e-mail); the exact text the captive portal shows; whether the device received an IP; whether other rooms or the lobby work; for PMS logins, the check-in time in the PMS; for speed complaints, the tariff the user was authorised with, the Wi-Fi link rate, and a test with a voucher on a higher plan.
<!-- evidence: FW-026, FW-027, FW-187, FW-206, FW-180 -->

### PMS integration

Which PMS (Opera via FIAS or OHIP, Opera Cloud, Protel Air, Shiji, 1C); one example guest with room and check-in time in the PMS versus the Guest list; whether any check-ins arrive at all; the regional API/callback domain in use; whether the interface was restarted or a database resync requested; for postings, the items, room, time and whether the guest was already checked out.
<!-- evidence: FW-021, FW-174, FW-187, FW-196, FW-031 -->

### Orders and notifications

Order number or a screenshot of the order; Shop Order or Service Request; which surface placed it; who processed it (login) and a video of the status change if it will not change; where the notifications go (e-mail, Telegram bot, Acme Staff) and for which user; for e-mail, the recipient and time so Mailgun delivery can be checked; for task trackers, the status seen on their side.
<!-- evidence: FW-047, FW-196, FW-135, FW-065, FW-053 -->

### Admin panel / CMS

Old or new panel; which URL/region or the local link; login option (password or SSO); a screenshot with the address bar; a white screen or an error text; whether another device or browser behaves the same; cookies enabled; whether the user exists in the staff list and with which role; for content, whether Publish was pressed and when.
<!-- evidence: FW-008, FW-154, FW-056, FW-146 -->

### HotSign

Device name as shown in the HotSign admin; app/build version on the device versus the others; whether the player is online; whether a reboot refreshes what Push Updates does not; for a black screen after uploading media, the file type; for a new Raspberry Pi player, which image was flashed (RPi 4 uses Hotsign-com-6.8) and whether the server page shows a pairing code while the player says "Not Connected" — that points at a wrong image or a player that cannot reach the server. Players are updated remotely by Support to the current build.
<!-- evidence: FW-149 -->

### Locks and cards (Russia only)

Room; whether only guest cards for that room fail or all cards; where they fail (door, elevator reader); the exact time of a failed attempt and any indication on the reader; audits read with Upkey from the lock and the reader; whether the lock and reader clocks are in sync; for mobile keys, the phone OS and the error text.
<!-- evidence: FW-055, FW-005, FW-194 -->

## 4. What a well-formed ticket looks like

A ticket that can be worked without a round-trip fits on one screen:

```
Property: <name as in the CRM>              Reported by: partner / hotel
Surface: TV | WebApp | native app | tablet | Staff app | old admin | new admin | HSIA portal | HotSign
Scope: one room | N rooms | whole property  Since: <date, time>
Example: room ___, time ___, guest / order ___
Evidence: 1800 photos | 1169 log | screenshot with address bar | video (attached)
What changed: update / power / network / devices / PMS — or "nothing known"
Access: VPN ok? AnyDesk? On-site person: yes / no
Region/URL and login option: EU / NA / RU / local; password / SSO
Impact in one line: <who cannot do what>
```

Use the same shape when you rewrite a vague report for R&D or the HSIA team.

## 5. Anti-patterns

### Asking for "more information"

"Could you send more details?" produces another vague message. Name the item and the way to get it: "photos of 1800 → Network and Authorization from the affected room", "a screenshot with the address bar", "the order number". A precise ask on a one-line report: "Guests log in through the PMS integration or with a voucher — what exactly do they see on screen, and what is the failure?".
<!-- evidence: FW-026 -->

### Diagnosing before the property is known

Checking logs, changing settings or sending steps before the property is confirmed wastes the work or, worse, applies it elsewhere. A message meant for another customer had to be retracted; a posting investigation could only start after "which property?". Confirm the property, then look.
<!-- evidence: FW-047, FW-021 -->

### Blaming the vendor without a log line

"This is on the PMS/POS/lock side" without evidence is a guess the partner will quote back. Refer to a vendor with the log line or the vendor's own confirmation; when the fix really is on their side, say exactly what to tell them — the regional callback domain, the whitelisting, the resync.
<!-- evidence: FW-005, FW-153, FW-196 -->

### Asking what we can see, and promising what we cannot

Do not ask for the licence count when the CRM has it or for the property when it is in the subject. Do not promise dates for R&D items — a "fix tomorrow" became a chase. Do not ask three rounds of single questions when one numbered list would do.
<!-- evidence: FW-204, FW-135, FW-048, FW-008 -->
