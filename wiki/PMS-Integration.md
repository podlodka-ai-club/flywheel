<!-- meta
id: pms-integration
type: product
audience: support
tags: [pms, opera, fias, ohip, opera cloud, protel air, shiji, webhook, 1c, check-in, check-out, posting, minibar, room status, integration]
-->

# PMS Integration

**Read this when:** check-ins do not reach the TV or the Wi-Fi login, a guest name is missing or wrong, minibar or order postings do not land on the folio, room statuses do not update in the PMS, or a webhook, FIAS interface, OHIP or a PMS vendor is mentioned.

---

## 1. What the integration carries and what depends on it

The PMS link is the source of guest identity for every product: without it the TV greets "Guest", Wi-Fi login by room number fails and nothing can be charged to the room. Many "Wi-Fi is broken" and "TV shows the wrong name" tickets are PMS-link tickets in disguise.

### Data flows in both directions
From the PMS to us: check-in and check-out events, the guest surname (only the surname, unless the PMS is set up to send more), room moves and reservation updates (extensions, name changes), and the *Posting deny / Posting allowed* flag that says whether charges may go to the guest's account. From us to the PMS: housekeeping room statuses set from the TV, and postings — minibar items entered by housekeeping on the TV and guest orders paid "to the room" — onto the folio. House-account postings after check-out exist where the PMS allows them; OHIP rejects postings to a reservation that is already checked out.
<!-- evidence: FW-021, FW-119, FW-217, FW-239, FW-193 -->

### Product behaviours that depend on it
On check-in: the TV powers on and greets "Dear {Surname}", the guest appears in the Guest list of the admin panel, Wi-Fi login by room number + last name starts working, the tablet check-in popup appears. On check-out: the account-reset command clears YouTube and other sign-ins on the TV and the TV goes to standby — without a PMS check-out no reset is ever sent. Ordering: payment to the room is offered only when the PMS sent Posting allowed. Housekeeping: room statuses and Inspect tasks on the TV travel through the same interface. A stalled link therefore shows first as "Guest" on the TVs of today's arrivals and Wi-Fi login failures for today's arrivals only — earlier guests keep working.
<!-- evidence: FW-157, FW-013, FW-206, FW-192, FW-175 -->

## 2. Supported PMS and transports

Which PMS a property runs, and through which transport, is the first thing to establish — partners often do not know; check our documentation for the property before asking them.

### Oracle Opera: FIAS on-prem and OHIP
Opera on-prem (and some Opera Cloud installations that expose an on-site interface host) talks FIAS: the TV server's `fias_connecter` opens a TCP connection to the interface host on port 5090, and the check-in/out records travel from the server to our cloud over the VPN. The interface is restartable from the server and its log names the failure ("no connection … i/o timeout" = the host or port is unreachable from the server's current route). Opera through OHIP uses the cloud API from our side: postings and reservation lookups are API calls; article codes for postings are cached by the integration, so newly created items post only after the cache refreshes (support or R&D can shorten the refresh interval); OHIP rejects postings after check-out.
<!-- evidence: FW-176, FW-021, FW-156 -->

### Shiji, Protel Air, 1C, CSV fallback
Shiji pushes reservation and profile events to our endpoint through webhooks configured in its Webhook Manager (see §4). Protel Air is reached from the TV server: when its logs stop, the first check is whether the PMS host and integration port answer from the server. 1C serves as the PMS at properties in Russia; room statuses and guest data follow the same product behaviours, and during a cloud incident statuses stop at every 1C property of a partner at once. A CSV reservation export is a fallback feed when the live interface is down: every row needs a status field — rows without it fail with "Error processing reservations: The status field is required", and the export is useless until the hotel fixes the data.
<!-- evidence: FW-193, FW-228, FW-046, FW-176 -->

### Integration URL and API address per property
Each property carries an integration address in its settings — the web-service URL of the hotel's system that we call — and, for push-type integrations, the hotel's system must send to our API address. Support can correct the integration URL when the hotel supplies the right one; a wrong or stale one looks like "no connection to the PMS" right after a PMS migration and is fixed in minutes. Ask the hotel to verify our API address on their side whenever data stops after a change on theirs — a working integration at the wrong address is silent, not broken.
<!-- evidence: FW-185, FW-174 -->

## 3. Regional API domains

Our cloud runs in regions (EU, NA, RU), and the PMS-facing endpoints follow the region of the property.

### The Russian domain for Russia, the international domain elsewhere
The PMS API and callback endpoints exist on a Russian domain for hotels in Russia and on an international domain for everyone else. A property whose PMS or webhook points at the wrong regional domain never receives statuses and acknowledgements, and its check-ins arrive nowhere — nothing is "down", the data goes to a region that does not know the property. Check which region the property belongs to (the admin panel region the partner logs into, see [Admin Panel and CMS](Admin-Panel-and-CMS)) before touching the PMS side, and give the hotel the regional API address that matches; the address itself is sent separately, not written into the ticket.
<!-- evidence: FW-196, FW-174, FW-185 -->

## 4. Shiji webhook migration

Shiji properties set up on the old event type need a one-time migration; it is a deployment-team change with a checklist, not a support-side toggle.

### Why: the old event type is deprecated
Shiji integrations that subscribe to the "Individual Updated" event miss updates: that event type is deprecated, so profile changes, reservation updates and room moves may be lost — which shows as "the webhook keeps deactivating" or as guests who cannot log in to Wi-Fi after a room move. The current integration needs the event types "Individual Notification" and "Reservation Notification". Delayed request processing on our cloud side can also make a webhook temporarily unavailable; the migration to the new integration version is the durable fix, the delay is ours to explain.
<!-- evidence: FW-193 -->

### The cut-over: new subscription, window, rollback
Never edit the working webhook. The PMS side creates a new event subscription in the Webhook Manager (copy the values from the existing one, change the event to "Individual Notification", keep "Reservation Notification"), sets an implementation date, then in an agreed window disables the old subscription and activates the new one while we switch our side. Change and testing take under an hour with no guest impact; if tests fail, switch back to the old subscription and investigate. The PMS vendor's support assists and no cost is involved. Our deployment team owns the window and answers downtime questions; support sends the PMS interface checklist, whose HTTP Headers section holds the required header values — communication type codes may differ per property and the hotel verifies them. Front office tests afterwards: name change, room move, reservation update.
<!-- evidence: FW-193 -->

## 5. Common failure modes and their checks

Work from the symptom to the layer: is the PMS host reachable from the server, is the server reachable from us, is the cloud processing on time, is the data itself right.

### Link down: host unreachable, VPN dead, cloud delays
No check-ins for days and the interface will not start: from the TV server ping and telnet the PMS host and port — "Destination Host Unreachable" / "No route to host" means the PMS is off or the network changed (hotel IT); an i/o timeout with the host alive means the wrong source VLAN or static route. If we cannot reach the server at all, the VPN is down and the FIAS data path with it — see [Remote Access and Connectivity](Remote-Access-and-Connectivity). During cloud incidents request processing is delayed: check-ins arrive hours late (3–5 hour estimates have been given), webhooks deactivate, room statuses stop changing at every property of a partner at once — say so, give the estimate we were given and do not ask the hotel to change anything.
<!-- evidence: FW-228, FW-176, FW-206, FW-031, FW-020 -->

### Guest data missing or wrong
"Guest" instead of a name on today's arrivals while the Guest list is correct: usually not the PMS at all — the TV could not authorise (licence limit) or did not refresh; check 1800 → Authorization, Connected devices and the licence count ([Acme TV](Acme-TV)). After a power outage or VM restart the interface may come up without the current in-house list; restarting it alone may not help — L2 repairs and asks for a TV photo if it recurs. Login rejected for one guest while others from the same day work: the surname is stored differently (a feminine ending, a transliteration) — tell the guest the exact form; or the attempt happened before the check-in reached us. "Wrong surname on the TV": ask which room and which guest should be shown plus 1800 Network and Authorization photos — hotels often fix it themselves in the PMS.
<!-- evidence: FW-168, FW-156, FW-174, FW-187, FW-181 -->

### Postings and payment flags
Minibar or order postings missing from the folio: check the whole period, not only the noticed rooms (E-005 in [Escalate or Answer](Escalate-or-Answer)); confirm the guest was still checked in when the posting was sent — OHIP rejects postings after check-out; confirm the article code exists in the integration cache (new items appear after the refresh); and confirm the TV server reaches our queue endpoint, which carries check-ins, orders and postings — a partially blocked endpoint gives "three of five postings worked". If the standard queue endpoint cannot be reached from the property, get it unblocked rather than moving the property to a special configuration the next engineer will not know about. Order fails at "pay to room": the PMS sent Posting deny — only Posting allowed enables room-account payment; nothing changed in the product. Paid in the PMS but "unpaid" with us: R&D with the order and folio references.
<!-- evidence: FW-021, FW-217, FW-064 -->

### Statuses, whitelisting and the TV-to-cloud path
Room statuses not updating in the PMS: our server logs show statuses received from the TVs and forwarded — if they are forwarded, the PMS side must check its interface logs; during a cloud incident the same symptom is ours. HTTP 403 with DomainException / NotWhitelisted from a PMS API means our calling address is not whitelisted for that tenant at the PMS vendor — room moves and extensions stop arriving until the vendor adds it; the address goes to the hotel through the responsible team. Inspect tasks or statuses missing on the TV while the web interface is right: the TV never reached our cloud — 1800 → Network shows cloud reachability, and the integration logs show no request at all.
<!-- evidence: FW-119, FW-046, FW-238, FW-192 -->

### Check-out not arriving, and template changes
The previous guest's name on the next guest's TV, YouTube still signed in, the TV not switching off: no PMS check-out reached us for that room — a Guest list full of records pending "Checked Out" confirms it. Guest data surviving check-out is E-002; the remedy is a check-out (from the PMS, manually in the admin panel, or in bulk by support) plus the per-property auto-check-out N hours after the planned departure. Wake-on-LAN is the fallback power path if the TV ignored the command, and a TV that ignores both needs a power cycle and a firmware check ([Acme TV](Acme-TV)). Registration links in online check-in templates changed to a wrong destination without the partner's action are an E-010 security signal, not a template question.
<!-- evidence: FW-157, FW-013, FW-250, FW-006, FW-060 -->

## 6. Standard remedies

Apply in this order; each one is cheap and most tickets end at the first two.

### Restart, resync, check-out, route, URL
1. Restart the integration interface on the TV server (or ask L2) — data usually flows again within minutes; ask the hotel to re-test after about 10 minutes.
2. Request a database resync when today's arrivals are missing but the interface runs.
3. Bulk check-out of stale records, and enabling auto-check-out after N hours where the hotel does not send check-outs reliably.
4. Fix the static route / source VLAN to the PMS host with hotel IT; whitelist our endpoints on their firewall.
5. Correct the per-property integration URL; ask the hotel to verify our API address in their system.
6. Test with a check-in in a vacant room and confirm greeting, Wi-Fi login and power-on before closing.

<!-- evidence: FW-205, FW-175, FW-157, FW-176, FW-185 -->

## 7. What to ask the hotel or the PMS vendor

Ask everything in the first reply; PMS tickets stall on missing examples more than on missing skills.

### Intake questions for PMS tickets
Which property (Q-001) and which PMS and transport. One concrete example: room, guest, time of check-in and of the failed login or missing posting (Q-004). What changed: PMS upgrade or migration, new PMS host or IP, firewall or VLAN changes, VPN work, power outage (Q-006). Whether the interface shows connected on the PMS side and whether their interface log shows our messages or errors. For webhooks: the subscribed event types and the endpoint configured. For whitelisting: the vendor contact who can add our address. For postings: whether the guest was checked in at posting time and whether the article exists in the PMS. Never blame the PMS vendor without the server-side evidence (ping and telnet output, interface log lines) in hand.
<!-- evidence: FW-228, FW-193, FW-021, FW-181 -->

## 8. Triage rows

### T-PMS-01 — TV greets "Guest" instead of the guest's name
**Symptom.** Guest checked in and visible in the admin panel, but the welcome screen says "Guest"; or several rooms lost the name after a server or VM restart.
**First checks.** Guest list has the guest; 1800 → Authorization and Network photos; the Connected devices row for the room (device data present?); licence count; when the VM last restarted; any cloud incident notice.
**Typical cause.** TV not authorised (licence limit exhausted) or not refreshed; interface came up without the in-house list after a restart; check-in delayed by a cloud incident.
**Owner.** Acme Support; licences per [Acme TV](Acme-TV).
**Fix or answer.** Free licences and reboot the TV; restart the interface and, if needed, L2 repair after a restart; during an incident give the estimate. The greeting can only show what the PMS sends — the surname.
**Also asked as.** «на ТВ показывается Guest вместо имени гостя», «после перезагрузки сервера пропали имена гостей», "TV shows Guest instead of the guest name", "guest info missing on the welcome screen"
<!-- evidence: FW-168, FW-156, FW-020, FW-239 -->

### T-PMS-02 — Wi-Fi login by room + last name fails for today's arrivals
**Symptom.** Guests who checked in today cannot log in to the Wi-Fi; earlier guests are fine; the portal says the room or surname is wrong.
**First checks.** Is the guest in the Guest list; the attempt time versus the check-in time; the exact surname stored; does the interface run and log; any other property of the partner affected.
**Typical cause.** Interface stopped or database out of sync; login before the check-in arrived; surname mismatch.
**Owner.** Acme Support.
**Fix or answer.** Restart the integration interface; request a database resync; ask the hotel to re-test after about 10 minutes. Explain pre-check-in attempts and give the stored spelling. Vouchers for waiting guests ([Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA)).
**Also asked as.** «сегодня перестало работать подключение по номеру комнаты», «нет синхронизации с PMS, гости не проходят авторизацию», "room number login not working for today's check-ins", "PMS sync stopped, guests cannot authenticate"
<!-- evidence: FW-175, FW-187, FW-174, FW-205 -->

### T-PMS-03 — No data from the PMS for days; the interface will not start
**Symptom.** Check-ins and check-outs have not arrived for days or weeks; the CMS shows no checked-in guests; restarting the interface does not help; "last logs from months ago".
**First checks.** Can we reach the TV server (VPN); from the server, ping and telnet the PMS host and port; the static route and source VLAN; the CSV fallback errors; whether the PMS was moved, replaced or switched off.
**Typical cause.** PMS host unreachable from the server (moved, off, network change); VPN down so the server cannot reach our cloud; wrong route or source VLAN.
**Owner.** Hotel IT for the PMS host and network; Acme Support for the server-side route; see [Remote Access and Connectivity](Remote-Access-and-Connectivity).
**Fix or answer.** Send the ping and telnet output; fix the route once the hotel names the expected source; restore the VPN; confirm data in the interface log and a test login.
**Also asked as.** «интерфейс не стартует, нет связи с PMS», «данные о заселении не передаются три недели», "PMS interface not starting", "no data received from the PMS since May"
<!-- evidence: FW-031, FW-176, FW-228, FW-206 -->

### T-PMS-04 — Wrong surname shown on the TV
**Symptom.** The TV greets a name that is not the guest in the room; or the login rejects the surname the guest is sure of.
**First checks.** Which room and which guest should be shown; the stored surname in the Guest list; 1800 Network and Authorization photos; whether a check-out for the previous guest arrived; a recent room move.
**Typical cause.** The PMS sent a different form of the name (gender ending, transliteration); a missed check-out or room move; occasionally a TV registered to the wrong room.
**Owner.** Acme Support; the hotel for the PMS record.
**Fix or answer.** Give the stored form; correct the PMS record or process the check-out; check the TV's room registration (1105 re-registers without a factory reset). Many such tickets are fixed by the hotel before we answer — still ask for the example.
**Also asked as.** «на ТВ некорректная фамилия гостя», «фамилия зарегистрирована в другой форме», "wrong guest name on the TV", "surname spelled differently in the system"
<!-- evidence: FW-181, FW-174 -->

### T-PMS-05 — TV does not power on at check-in, or does not reset at check-out
**Symptom.** TVs stay off at check-in; after check-out the TV stays on, YouTube stays signed in or the previous guest's name is still shown.
**First checks.** Does the check-in/check-out event appear in our logs; Guest list records pending "Checked Out"; a test check-in in one of the rooms; Wake-on-LAN enabled on the TV and allowed in the network; TV firmware version.
**Typical cause.** No check-out ever sent by the PMS (no reset command follows); a TV that ignores the command and Wake-on-LAN (firmware or hardware state); a poor connection between the property and our cloud.
**Owner.** Acme Support; hotel for the check-outs and TV power cycles; [Acme TV](Acme-TV) for firmware.
**Fix or answer.** Bulk check-out stale records and enable auto-check-out after N hours; power-cycle the unresponsive TV and update its firmware; ask for room and times on recurrence. Guest data surviving check-out is E-002.
**Also asked as.** «ТВ не включается при заселении», «после выселения YouTube не разлогинился», "TV does not turn on at check-in", "YouTube credentials not cleared after checkout"
<!-- evidence: FW-060, FW-013, FW-157 -->

### T-PMS-06 — Minibar or order postings do not reach the folio
**Symptom.** Housekeeping posted minibar items on the TV or a guest ordered "to the room", and nothing appears on the bill in the PMS; some postings work, others not.
**First checks.** The whole period, not only the noticed rooms; check-in state of the guest at posting time; whether the article code is new; whether the TV server reaches our queue endpoint; the integration log for the rejection reason.
**Typical cause.** Posting sent after check-out (OHIP rejects it); article code not yet in the integration cache; queue endpoint partially blocked from the property.
**Owner.** Acme Support with R&D; hotel IT for the block.
**Fix or answer.** Financial integrity — E-005 handling: quantify, escalate to R&D with examples, ask for a test room after the fix. Get the endpoint unblocked; ask R&D to refresh or shorten the article cache; tell the hotel to post before check-out.
**Also asked as.** «начисления минибара не попадают в PMS», «заказы не проводятся на счёт номера», "minibar postings not reaching Opera", "charges not posting to the folio"
<!-- evidence: FW-021 -->

### T-PMS-07 — Guest cannot pay to the room ("No Post")
**Symptom.** An order fails or the room-account option is missing for one guest; the hotel says "it used to go through even with No Post".
**First checks.** The Posting flag received for that guest from the PMS; whether other guests can pay to the room; the payment methods enabled for the property.
**Typical cause.** The PMS sent Posting deny for that reservation.
**Owner.** Acme Support (answer); the hotel for the PMS flag.
**Fix or answer.** Explain that room-account payment requires Posting allowed from the PMS; the hotel changes the flag on the reservation. Nothing changed in the product logic. Card and cash options are per property ([In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App)).
**Also asked as.** «ошибка при оформлении заказа, статус No Post», «нельзя оплатить на счёт номера», "cannot pay to room", "order error with No Post status"
<!-- evidence: FW-217 -->

### T-PMS-08 — Payment status differs from the PMS (paid vs unpaid)
**Symptom.** An order shows "unpaid" in our system while the PMS marks it paid (or the reverse).
**First checks.** Order number, room, time; how the payment was made (room account, card, cash); whether the posting reached the PMS at all; other orders of the same day.
**Typical cause.** A status update that did not travel back, or a posting confirmed on one side only — needs the logs on both sides.
**Owner.** R&D via Acme Support.
**Fix or answer.** Collect the references and hand to R&D; do not correct statuses by hand. A payment without a matching order, or an order lost after payment, is E-003.
**Also asked as.** «статус оплаты не совпадает с PMS», «у вас не оплачен, в PMS оплачен», "order shows unpaid but is paid in the PMS", "payment status mismatch"
<!-- evidence: FW-064 -->

### T-PMS-09 — Room statuses from the TV do not update in the PMS
**Symptom.** Housekeeping sets a status on the TV and the PMS never shows it; one hotel or all hotels of a partner.
**First checks.** Our server log: statuses received from the TVs and forwarded to the PMS; any cloud incident in progress; whether 1C or another PMS; 1800 → Network on an affected TV; the TV app version.
**Typical cause.** The PMS side not processing what we forward (their interface log); a cloud incident; an outdated TV app.
**Owner.** Hotel / PMS vendor when we forward correctly; Acme Support and R&D during an incident.
**Fix or answer.** Show the forwarded statuses and ask for the PMS interface log; during an incident give the estimate and re-test afterwards; plan a Acme TV update where the app is old ([Updates, Maintenance and Change Control](Updates-Maintenance-and-Change-Control)).
**Also asked as.** «не обновляются статусы номеров в PMS», «не меняется статус номера через ТВ, проверьте интеграцию с 1С», "room statuses not updating in the PMS", "cannot change room status from the TV"
<!-- evidence: FW-119, FW-046 -->

### T-PMS-10 — Shiji webhook keeps deactivating
**Symptom.** The webhook between Shiji and our platform deactivates repeatedly; while it is down guests cannot log in to the Wi-Fi with last name and room number.
**First checks.** Event types subscribed ("Individual Updated" versus "Individual Notification" + "Reservation Notification"); any cloud processing delay at the time; the endpoint configured; whether the property already migrated.
**Typical cause.** Deprecated event type on the old integration version; delayed cloud request processing.
**Owner.** Acme Support to explain; deployment team for the cut-over; the PMS vendor for the new subscription.
**Fix or answer.** Send the PMS interface checklist, have the PMS side create a new subscription (never edit the working one), agree a window, cut over, test name change / room move / reservation update, roll back if tests fail. No cost from the vendor.
**Also asked as.** «webhook между PMS и Wi-Fi постоянно отключается», «гости не входят после переселения», "webhook keeps deactivating", "Shiji integration drops every day"
<!-- evidence: FW-193 -->

### T-PMS-11 — PMS API returns 403 NotWhitelisted
**Symptom.** Room moves and stay extensions no longer reach the HSIA or TV side; the integration log shows HTTP 403, DomainException / NotWhitelisted, "tenant is not whitelisted for the calling IP address".
**First checks.** When it started; whether our calling address changed (region transfer, new gateway); the PMS vendor contact who manages the tenant whitelist.
**Typical cause.** Our address is not whitelisted for that tenant at the PMS vendor.
**Owner.** The PMS vendor adds the address; Acme Support supplies it through the responsible team.
**Fix or answer.** Give the hotel the address to be whitelisted (sent separately) and the error text for the vendor; re-test a room move after the change. Nothing to fix on our side unless the address changed on ours.
**Also asked as.** «PMS API возвращает 403 NotWhitelisted», «переселения не приходят в HSIA», "tenant not whitelisted for the calling IP", "reservation updates not pushed to HSIA"
<!-- evidence: FW-238 -->

### T-PMS-12 — Check-in arrives hours late; Inspect tasks missing on the TV
**Symptom.** The check-in time in our system differs from the PMS by hours, so the guest cannot log in and the TV shows no name; or housekeeping does not see Inspect tasks on the TV although the web interface is right.
**First checks.** A cloud incident notice; the delay for other properties; for Inspect: whether our integration log shows any request from those rooms; 1800 → Network on the affected TV.
**Typical cause.** Delayed request processing in the cloud (check-in transfer); the TV unable to reach the cloud (Inspect).
**Owner.** Acme Support and R&D (cloud); hotel IT for the TV-to-cloud path.
**Fix or answer.** During an incident: apologise, give the estimate (3–5 hours has been given) and confirm afterwards. For Inspect: the integration is fine, the TV never sent the request — check the network path and send the Network page photo.
**Also asked as.** «задержка передачи заселения в систему», «номера не выводятся в модуль Inspect через ТВ», "check-in delayed by hours", "inspect tasks not shown on the TV"
<!-- evidence: FW-020, FW-192, FW-046 -->
