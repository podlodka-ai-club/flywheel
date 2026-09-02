<!-- meta
id: unsupported-requests-and-alternatives
type: decision
audience: support
tags: [unsupported, request, alternative, cannot, feature, netflix, bluetooth, wifi, authentication, payment, priority, firmware, license, locks, release]
-->

# Unsupported Requests and Alternatives

**Read this when:** a customer asks for something the platform does not do, or that we do not do, and you need the standard answer and what to offer instead.

---

## 1. How to say no

Say what is not possible in one sentence, say why in one more, and give the alternative in the same reply. Do not promise a date for anything that is "planned" or "in the backlog" — the product manager decides and R&D schedules. Log every unsupported request that has a use case as a feature request (status Push RND/Product/etc). Never invent a feature to soften the answer. The entries below are the standard answers; each is self-contained.

## 2. Wi-Fi and network

### U-001 — Disabling Wi-Fi authentication permanently
**Request.** "Turn off the login page" or "make the guest Wi-Fi open" — usually as a quick fix when guests cannot log in.
**Answer.** Not as a permanent state. A temporary open network is an exception the HSIA team approves and time-boxes; authentication is switched back on afterwards.
**Why.** Authentication ties a session to a guest (PMS login, voucher, SMS) and enforces tariffs and expiry. A request to disable it permanently is a security signal (trigger E-010) and usually hides the real fault.
**Instead.** Diagnose the login failure: most "cannot log in" reports are attempts before the PMS check-in was registered, a surname typed differently from the PMS, an expired voucher, or a broken PMS→CMS connection. If an exception is granted, record who approved it and when it ends, and open a task to restore authentication.
**Also asked as.** «временно отключить авторизацию», «сделать сеть без авторизации», "disable the authentication page", "open network for now"
<!-- evidence: FW-187, FW-027, FW-203 -->

### U-002 — Guaranteeing bandwidth beyond the uplink, or per-guest allocations
**Request.** "We upgraded the line but guests still see less — guarantee the full speed" or "give this VIP guest 300 Mbps".
**Answer.** We cannot guarantee a speed. We control the MikroTik gateway only; what a user sees is shaped by the tariff they are authorised with, capped by the Wi-Fi link rate to the access point, and shared with everyone on the uplink.
**Why.** The uplink, switches and access points belong to the hotel or its contractor. Upload and download share one link, so per-user speed moves with total load.
**Instead.** Set the WAN bandwidth setting to the real uplink; create a higher tariff/plan (voucher or MAC whitelist) for the guest who needs it and measure with a test voucher; plan capacity at roughly 20 Mbps per guest, which is enough in practice; for a VIP, test in the room before arrival, not on the day.
**Also asked as.** «увеличить скорость для гостя до 300 Мбит/с», «после расширения канала скорость не выросла», "guarantee the bandwidth", "raise the speed for a VIP guest"
<!-- evidence: FW-012, FW-180 -->

## 3. Ordering, payments and notifications

### U-003 — Hiding a menu section on a schedule, or warning guests outside ordering hours
**Request.** "Hide the night menu during the day" or "show a disclaimer when the guest orders outside working hours".
**Answer.** A section cannot be hidden on a schedule. Ordering hours can be set per menu/section; outside them "As Soon As Possible" is unavailable and the order is scheduled to the nearest slot. A disclaimer for out-of-hours orders is in the development backlog — no date.
**Why.** Visibility is controlled by Menu Builder and publishing, not by time; working hours act on ordering, not on display.
**Instead.** Set working hours per section and name sections so the hours are obvious; tell staff that an out-of-hours order carries a scheduled time, not ASAP. If an item can still be ordered for delivery outside its hours, that is a bug — reproduce and escalate. Log the disclaimer wish as a feature request.
**Also asked as.** «скрыть раздел меню по расписанию», «нет предупреждения при заказе вне рабочего времени», "hide the night menu in the daytime", "no disclaimer outside working hours"
<!-- evidence: FW-036, FW-159 -->

### U-004 — Payment-method choice when ordering on the TV
**Request.** "On the phone the guest picks card or cash; on the TV there is no choice — add it."
**Answer.** Not available. The TV ordering flow has no payment-method selection.
**Why.** The TV flow does not include a payment step; the only payment feature on the TV is the QR option.
**Instead.** The QR payment-gateway option: the TV shows a QR code and the guest pays on the phone through the payment gateway — still without a method choice. Guests who need card-or-cash use the Guest App, where the payment options ("Enable online payments", "Enable on arrival payments") apply; TV orders can stay "settle with the restaurant directly".
**Also asked as.** «нет выбора способа оплаты при заказе с ТВ», «оплата картой или наличными на телевизоре», "payment method on the TV", "choose cash or card on TV"
<!-- evidence: FW-140 -->

### U-005 — Stopping overdue reminders at Confirmed
**Request.** "Staff confirmed the order, but overdue e-mails keep coming — stop them at Confirmed" or "send them every 15 minutes until accepted, then stop".
**Answer.** Not configurable today. Reminders repeat until the order is Confirmed and then Completed; that is by design. Configurable notification settings are planned — no date.
**Why.** The reminder is a control that an order was processed to the end; a Confirmed order that is never Completed still needs attention.
**Instead.** Process orders to Completed when delivered — a backlog of unprocessed orders produces exactly this stream; check per-user notification settings (Staff list → Edit user → Notification page) and the services ticked in each profile so the right people receive them; log the wish as a feature request.
**Also asked as.** «уведомления о просроченном заказе после подтверждения», «письма о задержке заказа не прекращаются», "overdue notifications after confirmed", "stop reminders once accepted"
<!-- evidence: FW-016, FW-196 -->

### U-006 — Setting task priority towards Flexkeeping
**Request.** "Every task pushed to Flexkeeping must arrive as HIGH priority — set it on your side."
**Answer.** Not possible: the platform has no priority entity. All guest orders are treated as top priority, so there is nothing to map or expose.
**Why.** Priority is a Flexkeeping concept; our integration sends the task, not a priority field.
**Instead.** Ask the hotel to configure a default priority in Flexkeeping for tasks arriving from our integration. If Flexkeeping insists it must come from the sender, log a feature request for the product manager with their API reference attached.
**Also asked as.** «приоритет задач в Flexkeeping», «все заявки с высоким приоритетом», "task priority Flexkeeping", "HIGH priority for pushed tasks"
<!-- evidence: FW-242 -->

### U-007 — Placing test orders from a browser
**Request.** "We always tested orders from a browser logged in as a test room — it stopped working."
**Answer.** Temporarily not supported. A browser session shows content only; it cannot open the 1800 service page or place test orders. The team is working on order testing in the browser — no date.
**Why.** Orders need a registered device in a room; the browser session has none.
**Instead.** Place test orders from a tablet or TV in a vacant room; on a tablet, tap the room number repeatedly until the popup appears and enter 1800 for diagnostics; compare the result in the admin panel and the task tracker.
**Also asked as.** «тестовый заказ через браузер», «заказы из браузера не доходят до админки», "test order from the browser", "orders placed in a browser do not arrive"
<!-- evidence: FW-073 -->

## 4. TV, apps and devices

### U-008 — Netflix and streaming apps on TVIP set-top boxes
**Request.** "Enable Netflix on our IPTV system" — where the rooms run TVIP boxes.
**Answer.** Netflix is not available on the TVIP set-top box and cannot be installed on it.
**Why.** Streaming apps are part of the TV platform, not of the Acme app; availability depends on the TV model.
**Instead.** On supported hotel TVs Netflix is enabled in the source settings and published — it appears on the TVs automatically. Philips HFL6014U and HFL7111T support Netflix (installation guide with App Control in our documentation). Other streaming apps can be added to the entertainment section for supported Philips and Samsung models. For rooms on TVIP, a TV or box replacement is a commercial topic for the AM.
**Also asked as.** «активировать Netflix на приставке», «стриминговые приложения на ТВ», "Netflix on the set-top box", "enable Netflix for the property"
<!-- evidence: FW-230, FW-243, FW-143 -->

### U-009 — IPTV on a hotel TV without the Acme app
**Request.** "Add a plain TV with an RJ-45 port to the network so it just shows the IPTV channels, without Acme Hotels Inc."
**Answer.** On hotel TV series, IPTV cannot be watched without installing the Acme TV app; we know no other way to start the channels on those sets.
**Why.** Hotel-series TVs need an application to tune multicast channels, and the Acme TV app is that application.
**Instead.** Confirm the streams reach the cable with VLC on a laptop, then install the Acme TV app by the standard instruction for that TV model and register it. A separate menu for a channels-only TV is possible, but a dedicated display group for one TV is error-prone — after checking with content managers, the standard install is the recommendation.
**Also asked as.** «подключить обычный телевизор к IPTV», «этажный ТВ без Acme Hotels Inc.», "IPTV on a corridor TV", "channels without the Acme app"
<!-- evidence: FW-144 -->

### U-010 — Guaranteeing Bluetooth headphones
**Request.** "Can guests pair wireless headphones to the TV?" or "Bluetooth works from Android but not from iPhones — fix it."
**Answer.** We cannot confirm or guarantee it. Bluetooth pairing is a TV feature; the module and its menu belong to the TV manufacturer, and we do not control it.
**Why.** The Acme TV app does not manage the TV's Bluetooth; behaviour differs by TV model, firmware and phone OS.
**Instead.** Try pairing directly from the TV's own connection menu. If one phone OS fails while another works, test on a TV without the Acme app to see whether the app is involved, and report the TV model and firmware; otherwise refer to the TV manufacturer.
**Also asked as.** «подключить Bluetooth-наушники к телевизору», «не подключается Bluetooth с iPhone», "Bluetooth headphones on the TV", "Bluetooth pairing from iPhone fails"
<!-- evidence: FW-212, FW-044 -->

### U-011 — Remote mass-enabling of Virtual Standby
**Request.** "The app takes about 30 seconds to start after power-on; enable Virtual Standby on all our rooms remotely."
**Answer.** Virtual Standby is set in the TV's hotel-mode service menu (LG: Mute → 1 → 1 → 9 → OK). On some TV models it cannot be applied in bulk remotely — each set is configured by hand.
**Why.** It is a TV firmware setting, not a Acme app setting.
**Instead.** Explain where the time goes: the TV's own boot dominates and the app start is the smaller part. Have the hotel set Virtual Standby ON during room rounds; Wake-on-LAN remains the fallback power-on path.
**Also asked as.** «массово включить Virtual Standby», «долго загружается приложение при включении ТВ», "enable Virtual Standby on all TVs remotely", "slow app start after power on"
<!-- evidence: FW-049 -->

### U-012 — Lowering channel stream quality, or making end-of-life LG sets keep up
**Request.** "Old TVs lag on some channels — lower the quality on your streamer", "push a firmware update over the network to the LG LX sets", "fix YouTube on the LX sets".
**Answer.** We cannot lower the quality of a channel stream; the streamer relays what the headend sends. We cannot push TV firmware over the network to those sets. End-of-life LG models (LX, LY series, 10+ years old) are not guaranteed to run YouTube or high-bitrate channels even on the latest firmware.
**Why.** Buffering and app support are hardware and firmware limits of the TV; our app only tunes to the address.
**Instead.** Confirm with VLC from a laptop in the TV VLAN that the stream itself is fine; have the hotel update the TV firmware from our file server, one TV first; check the version at 1800 → Device or in Connected devices; where it still lags, the remedy is replacing the sets — say so plainly and involve the AM.
**Also asked as.** «понизить качество потока на стримере», «обновить прошивку по сети на старых LG», «лагают каналы на старых телевизорах», "lower the stream bitrate", "push firmware over the network", "YouTube freezes on LG LX"
<!-- evidence: FW-061, FW-011 -->

### U-013 — Showing the guest's first name on the welcome page
**Request.** "Greet the guest by first name (or full name) on the TV welcome page."
**Answer.** Only what the PMS sends can be shown. Today we receive the surname, so the greeting is "Dear {Surname}"; a first name appears only if the PMS integration sends it.
**Why.** The greeting is rendered from the PMS check-in data; the TV app holds no separate guest profile.
**Instead.** Move from artwork with the greeting baked into the image to the editable layout: greeting first, then the welcome message in its own field, a background image without text — then the greeting can be edited in the admin panel. Ask the hotel's PMS contact whether the interface can include the first name. Keep the welcome text short: a long letter fills the whole page.
**Also asked as.** «показывать имя гостя на приветственной странице», «обращение по имени на ТВ», "personalised greeting on the welcome page", "first name in the welcome message"
<!-- evidence: FW-239 -->

### U-014 — Pinning a specific HotSign build
**Request.** "Update this player to the same 4.x version as the others" or "roll back to the old build".
**Answer.** Arbitrary versions cannot be pinned or rolled back. Players are updated remotely by Support to the current build (5.37.12 as of August 2026).
**Why.** Selectively rolling a device back or up to a particular build is technically not possible in the HotSign update path.
**Instead.** Update the player to the latest build and re-test — content not refreshing on Push Updates is fixed by the update in practice; where players must stay identical, update all of them; reboot a player that still does not refresh.
**Also asked as.** «обновить панель до версии 4.9.7», «откатить версию HotSign», "pin the HotSign version", "roll back the player build"
<!-- evidence: FW-149 -->

## 5. Security, releases and process

### U-015 — Sharing server logins and passwords
**Request.** "Send us the server credentials again" or "give us the password for the hotel admin accounts".
**Answer.** No. We do not send logins or passwords by e-mail, and we do not hand server credentials to third parties.
**Why.** Security rule and trigger E-010; the server holds guest data and the PMS interface.
**Instead.** For the admin panel: create the user with the right role (Administrator) or send a password-reset; a password set manually goes privately to the named person. For server-side checks: we connect ourselves over VPN, or through AnyDesk on a PC in the server's network with the hotel present. Contacts are shared with the requester privately, not in the ticket.
**Also asked as.** «пришлите учётные данные от сервера», «дайте пароль от админки», "send the server login", "share the admin password"
<!-- evidence: FW-031, FW-146, FW-209 -->

### U-016 — Release dates for R&D items
**Request.** "When will this be fixed or released?" — after a bug or feature request has gone to R&D.
**Answer.** We do not give dates for R&D items. We confirm the task exists and update the ticket when the fix is released and deployed at the property.
**Why.** Fix, test and deployment are separate steps that cannot be compressed on request; a date given informally becomes a promise the partner relays to the hotel and then chases.
**Instead.** State what is confirmed, the workaround, and when we will next report. If the wait passes 30 days, review with the PM/AM (trigger E-009). Be plain when the answer is "no date".
**Also asked as.** «когда будет исправлено?», «назовите сроки», "any ETA?", "when will the fix be released?"
<!-- evidence: FW-048, FW-245, FW-249, FW-029 -->

### U-017 — Proactive mass updates of all properties
**Request.** "If it is a known bug, push the fix to all your customers before guests notice."
**Answer.** We do not push updates to all properties proactively.
**Why.** Reported issues are often specific to a TV model, firmware or environment; an update needs prior notice, a maintenance window with possible downtime (up to 1 hour for cloud deployments) and someone on site to verify — coordinating that with the hotel is the partner's role.
**Instead.** Agree a window per property; use the test-folder method (one TV first, then the main folder); the partner can ask which of its properties run older versions and schedule them; product-wide bugs are tracked in [Known Issues and Release Notes](Known-Issues-and-Release-Notes).
**Also asked as.** «обновите всех клиентов заранее», «почему не обновили все отели на этой версии», "roll out the fix to all customers", "why not update proactively"
<!-- evidence: FW-010 -->

## 6. Locks and access control

### U-018 — Third-party card-writing software, or the pre-cloud lock software
**Request.** "The lock system is down — can we write keys with other software, or go back to the old (pre-cloud) program?"
**Answer.** No. Keys cannot be written with third-party software, and the pre-cloud software is not an option after the move to the cloud service. A local (server) version of the access-control software is in development — no date.
**Why.** Cards are bound to the hotel code and the cloud credential service; other tools cannot produce valid keys.
**Instead.** During a vendor outage: the hosts-file/VPN workaround; write a card at the lock itself through the mobile app (permanent or temporary card with a validity period; a single beep confirms). SmartPass asking for a registration code after a reinstall gets a temporary code, then the permanent one.
**Also asked as.** «сторонняя программа для записи карт», «вернуть старое ПО замков», "write keys with other software", "use the old lock software"
<!-- evidence: FW-194, FW-161 -->

### U-019 — Access-control support outside Russia
**Request.** "Do you support the OS Access lock system at our property?" — from a property outside Russia.
**Answer.** No. Support for the OS Access-based lock system is provided in Russia only.
**Why.** Access control is a Russia-only product line for Acme Support; we hold no information on sales or service partners in other regions.
**Instead.** Official documentation is on the system manufacturer's site; the hotel should ask its original installer or the manufacturer for a regional service partner. Do not start remote lock diagnostics for such properties.
**Also asked as.** «поддержка замков osaccess в нашем регионе», «кто обслуживает электронные замки», "osaccess support outside Russia", "who supports the locks in our region"
<!-- evidence: FW-219 -->
