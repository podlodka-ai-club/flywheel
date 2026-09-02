<!-- meta
id: guest-app
type: product
audience: support
tags: [guest app, webapp, web app, mobile app, native app, qr code, login, region, device types, guest messages, online payments, view bill, slow loading, incognito, app store]
-->

# Guest App

**Read this when:** a guest or partner reports a problem with the Acme Guest App — the WebApp in a browser or the native mobile app — logging in, missing content, Guest Messages, payments, the bill, or slow loading.

---

## 1. What it is

The Acme Guest App exists in two forms. The **WebApp** runs in the phone's browser: from the internet it is reached on a public per-hotel subdomain, inside the hotel network also on the internal IP address of the TV server. The **native mobile app** is installed from the App Store or Google Play, and the user selects a region — Europe or Asia — at login. Both show the same content as Acme TV, filtered by the device types set on each content item: an item is visible in the app only when it carries WEB (browser) and GUESTAPP (native); TV-only items are simply absent. Guests get to the app by scanning QR codes shown on the TV screen or printed on in-room materials; the code on the TV also logs them into their room. When a ticket just says "the app", ask which client is meant (gate Q-002 in [Ticket Intake Checklist](Ticket-Intake-Checklist)) — "app" tickets regularly turn out to be about the TV, a tablet or the Staff app.
<!-- evidence: FW-134, FW-165, FW-075, FW-019 -->

## 2. Getting in

### QR login from the TV needs an active check-in

Scanning the QR code on the TV logs the guest into the WebApp for that room only while the TV has an active check-in. If the login returns an error, first check whether the guest's surname is shown on the TV welcome screen; "Guest" means the room is not checked in on that TV and the QR login cannot succeed — this also applies to a guest holding two rooms, each room's TV must be checked in. Ask for photos of the 1800 diagnostic page, sections Network and Authorization ([Acme TV](Acme-TV)), and test the QR yourself on a checked-in room: if it works for us and fails at the hotel, the check-in on that TV is the problem, not the app. Login attempts made before the PMS check-in is registered fail — that is not a fault ([PMS Integration](PMS-Integration)).
<!-- evidence: FW-019 -->

### Native app: choose the right region

The native app asks for a region at login — Europe or Asia. The typical "the app does not let us in, but the web version works" report is the wrong region selected: tell the user to log out and choose Europe instead of Asia, which was the fix in the reported case. If the correct region still fails, ask for a screenshot of the error and the app version shown in the store, then involve R&D. Region and login option are gate Q-008 on partner tickets ([Ticket Intake Checklist](Ticket-Intake-Checklist)).
<!-- evidence: FW-075 -->

### Public link, internal link, and auto-open after Wi-Fi

"What is the address of our app on the internet?" has two answers. Inside the hotel network the WebApp opens on the internal IP address of the TV server — that address is not reachable from the internet. From anywhere it opens on the property's public Guest App subdomain. Give both and say which is which: the internal one is the link that "does not open from home". When a hotel wants the interface to open automatically on the guest's phone after joining the guest Wi-Fi, the address to hand over is the public subdomain, never the internal IP; how the phone is sent there after Wi-Fi login is a captive-portal question for the HSIA side ([Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA)). Never paste another property's addresses into a reply.
<!-- evidence: FW-134, FW-063 -->

### QR code opens a search page instead of the app

A QR code on a sign or leaflet that sends the phone to a search results page, while the same address typed by hand opens the app, encodes something other than a usable address. Scan the code ourselves first. If it resolves to the property's Guest App address for us, ask the reporter to re-scan with the phone camera and report the result — some scanner apps treat the payload as text to search for. If our scan also lands on a search page, the code was generated from the wrong text: regenerate it from the full address including the scheme.
<!-- evidence: FW-133 -->

## 3. Content and layout

### Device types decide what the app shows

Every content item carries device types — TV, WEB, GUESTAPP. A tile that throws an error in the app while its neighbours open (Hotel Info and Weekly Program are typical) means the menu item was created without WEB and GUESTAPP: add them in the admin panel, publish, and verify in an incognito browser. Splitting categories so that one set shows only on TV and another only in the app is supported, but it has produced gaps in the TV layout and categories that would not open in the app; when that happens, reproduce in incognito, take a screenshot that shows the application version, and hand it to R&D. Publishing propagates within about 20 minutes and the section must exist in Menu Builder ([Admin Panel and CMS](Admin-Panel-and-CMS)).
<!-- evidence: FW-165, FW-043 -->

### Texts, languages and links

Texts of menu items (restaurant pages, section descriptions) are edited by the hotel in the admin panel; when a partner cannot find the place, send annotated screenshots of the location in both the old and the new panel rather than editing for them. Interface languages are enabled and disabled per property by support on request. External links open inside the app: "Book a table" reservation links and PDF menus work in the WebApp and the native app, but on in-room tablets the same links can show an error after half a second — a tablet firmware (webview) bug, not a content error ([In-Room Tablets and Room Control](In-Room-Tablets-and-Room-Control)). The city-guide map page on old tablets is legacy content that cannot be created in the new CMS. Menus, working hours and prices are ordering content ([In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App)); the guest's request history currently shows when a service request was created rather than what was ordered — a queued feature request without a date.
<!-- evidence: FW-221, FW-210, FW-030, FW-024, FW-249 -->

## 4. Guest Messages

### Staff notifications for guest messages

Guest Messages is the in-app chat between a guest and the hotel. Staff learn about new messages by e-mail sent through Mailgun; whether messages are notified instantly is a per-property setting. On "no e-mails for Guest Messages": confirm instant notifications are enabled for the property, open the Mailgun log and check the "Delivered" status for the addresses concerned, and ask the hotel to look in spam. If the hotel answers that order e-mails arrive but the alert for unanswered messages does not, that is a separate notification type — ask for a concrete example (date, time, the user who expected the e-mail) before escalating to R&D. Messaging can be made one-way on request so that only the hotel writes to the guest; get the partner's confirmation before disabling two-way chat.
<!-- evidence: FW-053, FW-033 -->

### Messages arrive although messaging is disabled

A hotel with messaging switched off everywhere can still receive a guest message. Known cause: when the guest's phone was using a VPN, a different version of the WebApp was served, and messaging was enabled in that version; R&D fixed it, after which guests could no longer send messages. Treat any recurrence as a product bug — collect the message timestamp and the room, do not tell the hotel their configuration is wrong, and hand it to R&D.
<!-- evidence: FW-148 -->

## 5. Payments and bill

### Stay payments: check-in and check-out are separate tabs

Two checkboxes govern payments in the app: **Enable online payments** and **Enable on arrival payments**. Check-in and check-out have separate configuration tabs, so a hotel can disable payment at check-in and keep it at check-out — the usual request is "guests pay at reception, but may check out online and settle the balance then". Disabling online payments removes the online button and leaves the on-arrival one; with on-arrival payments switched off guests can still place orders and pay at the reception. Explain the checkbox logic in writing before the partner changes anything, and ask them to test one stay afterwards.
<!-- evidence: FW-062 -->

### View Bill, Posting deny, and payment methods

"View Bill" failing with "error 9: Data unavailable" is fixed on our side: reproduce, take a screenshot with the error text, pass it to R&D, and meanwhile check that the PMS interface of the property is up ([PMS Integration](PMS-Integration)). An error when a guest tries to charge an order to the room while card and cash work is usually the PMS flag **Posting deny** for that guest — the PMS must send Posting allowed before room-account payment becomes available; nothing changes in the app. On the phone a guest can choose card or cash; ordering from the TV has no payment-method choice at all. The only TV-side alternative is the QR payment gateway, which shows a QR code leading to the gateway and offers no choice either ([In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App)).
<!-- evidence: FW-191, FW-217, FW-140 -->

## 6. Performance

### Slow loading: measure before you escalate

Our own cold load of the WebApp over mobile data takes about 10–20 seconds; complaints usually cite 30–60 seconds or "about a minute", and the same reporters have later measured 3–6 seconds. Numbers depend on the network, so establish facts first: ask for tests from mobile data (two operators if possible) and from the hotel Wi-Fi, in an incognito browser, with a screencast from the phone that shows the timing. If it is slow or blocked only from the hotel network, the hotel or ISP is filtering the address — hotel IT. Requests for front-end optimisation (bundle size, compression, CDN caching) go to R&D as improvement requests without dates. Fixes for the native app appear only with the next store release; the WebApp gets them first.
<!-- evidence: FW-063, FW-178, FW-043 -->

## 7. Testing tips

Test the WebApp in an incognito browser window so that cached content does not hide a fix or a fault. Native-app behaviour can only be checked with the version from the store — install it yourself; the store update lags the WebApp. Orders and service requests are tested from a tablet or TV in a vacant room: a browser session shows content only and cannot place test orders or open the service page. When checking the TV layout in a browser, reduce the page scale to 80% so the screen renders fully — a "black screen" from a browser test is usually this. Record the application version visible in the screenshot; R&D asks for it first.
<!-- evidence: FW-043, FW-073, FW-056 -->

## 8. Triage rows

### T-APP-01 — QR login from the TV returns an error
**Symptom.** The guest scans the QR code on the TV and the WebApp shows an error instead of logging them in; a guest holding two rooms fails on both.
**First checks.** Is the guest's surname shown on that TV, or "Guest"? Photos of 1800 → Network and Authorization. Scan the QR yourself on a room that is checked in.
**Typical cause.** No active check-in on the TV at the moment of scanning — the PMS check-in has not reached the TV, or it is the wrong room.
**Owner.** Acme Support; [PMS Integration](PMS-Integration) path if check-ins are not arriving at all.
**Fix or answer.** Have the hotel confirm the check-in on the TV (surname on the welcome screen), then re-scan. Login before the PMS check-in is registered fails by design.
**Also asked as.** «ошибка при входе по QR-коду», «гость не может войти в веб-приложение через QR», "QR code login returns an error", "guest app login fails after scanning the code"
<!-- evidence: FW-019 -->

### T-APP-02 — Native app will not log in, the web version works
**Symptom.** Staff or a guest cannot sign in to the mobile app from the store; the same credentials work in the WebApp.
**First checks.** Which region was selected at login — Europe or Asia? App version from the store page; screenshot of the error.
**Typical cause.** The wrong region selected at login.
**Owner.** Acme Support.
**Fix or answer.** Log out and choose Europe instead of Asia. If the correct region still fails, send the screenshot and version to R&D.
**Also asked as.** «не получается войти в мобильное приложение, через сайт заходит», "can't log in to the app, only the web version works"
<!-- evidence: FW-075 -->

### T-APP-03 — "What is our app's address?" and the app does not open from the internet
**Symptom.** The partner cannot find the public link; the app opens only on the guest Wi-Fi, or "the logic is broken" because the web version works and the app does not.
**First checks.** Which address are they opening — the internal server IP or the public subdomain? Test the public subdomain from mobile data yourself.
**Typical cause.** The internal in-hotel address is being used outside the hotel; the public subdomain is unknown to the partner.
**Owner.** Acme Support.
**Fix or answer.** Give the public subdomain for the internet and the internal address for in-hotel use. For an automatic open after Wi-Fi login use the public subdomain; the redirect is a captive-portal matter on the HSIA side.
**Also asked as.** «по какому адресу открывается наше приложение», «должно ли приложение открываться из интернета», "what is the public link to the guest app", "the app doesn't open outside the hotel network"
<!-- evidence: FW-134, FW-063 -->

### T-APP-04 — QR code on printed materials opens a browser search page
**Symptom.** The link typed by hand opens the app, but scanning the QR code sends the phone to search results.
**First checks.** Scan the code ourselves; compare the decoded text with the property's Guest App address.
**Typical cause.** The code encodes text rather than the full address, or the scanner app searched the payload; if our scan resolves correctly, the problem is on the scanning side.
**Owner.** Acme Support; the hotel for regenerating its printed materials.
**Fix or answer.** If our scan opens the app, ask them to re-scan with the phone camera and report; otherwise regenerate the code from the full address including the scheme.
**Also asked as.** «QR-код ведёт на поиск в браузере», «по QR-коду не открывается приложение», "QR code opens a search page instead of the app"
<!-- evidence: FW-133 -->

### T-APP-05 — Tiles error or categories do not open in the app
**Symptom.** Tapping certain tiles (Hotel Info, Weekly Program) shows an error in the WebApp and the native app while other tiles open; or, after categories were split between TV and app, categories do not load in the app and the TV layout has gaps.
**First checks.** Device types on the affected menu item (WEB and GUESTAPP present?); reproduce in an incognito browser; screenshot showing the application version.
**Typical cause.** Missing WEB and GUESTAPP device types on the item; less often a layout bug after the split, which needs R&D.
**Owner.** Acme Support (device types); R&D (layout bug).
**Fix or answer.** Add WEB and GUESTAPP, publish, verify, and tell the partner to set device types when creating content. For the split-categories bug hand the evidence to R&D and warn that the native app receives the fix with the next store release.
**Also asked as.** «плитки не открываются, ошибка в приложении», «категории не загружаются в приложении», "tiles throw an error in the guest app", "categories won't open in the app"
<!-- evidence: FW-165, FW-043 -->

### T-APP-06 — Fixed on web and TV, still broken in the native app
**Symptom.** R&D reports a fix, the WebApp and TV behave, but the native app still shows the old behaviour and guests keep complaining.
**First checks.** Installed app version versus the current store version; install the store version yourself and retest.
**Typical cause.** App-store release lag — the fix has not been published to the stores yet.
**Owner.** R&D (release); Acme Support (communication).
**Fix or answer.** Explain that updates take time to appear in the app stores, give no date, and ask the hotel to update when the release appears. Do not reopen the R&D task for the same symptom.
**Also asked as.** «в веб-версии работает, в мобильном приложении по-прежнему ошибка», "fixed on web but still broken in the native app"
<!-- evidence: FW-043 -->

### T-APP-07 — No e-mail notifications for Guest Messages
**Symptom.** Hotel staff say they receive no e-mails when guests write in the app; often "order e-mails work, message alerts do not".
**First checks.** Instant notifications enabled for the property; Mailgun log shows "Delivered" for the addresses; spam folder checked; a concrete example (date, time, user).
**Typical cause.** E-mails delivered but filtered as spam, or the hotel expects an unanswered-message alert that differs from order alerts.
**Owner.** Acme Support; R&D if a delivered-but-missing example is confirmed.
**Fix or answer.** Report the Mailgun delivery status, ask for the spam check, and request the example before escalating.
**Also asked as.** «не приходят уведомления о сообщениях гостей», "no email notifications for Guest Messages"
<!-- evidence: FW-053 -->

### T-APP-08 — Guests send messages although messaging is disabled
**Symptom.** Messaging is switched off and absent from the app, yet a guest message arrives.
**First checks.** Timestamp and room of the message; whether the guest used the WebApp; whether the phone was on a VPN.
**Typical cause.** A guest on a VPN was served a different version of the WebApp in which messaging was enabled — a product bug, fixed by R&D.
**Owner.** R&D.
**Fix or answer.** Do not question the hotel's configuration; hand the example to R&D and confirm to the hotel once guests can no longer send messages.
**Also asked as.** «гости отправляют сообщения, хотя мессенджер отключён», "guests can message us although messaging is disabled"
<!-- evidence: FW-148 -->

### T-APP-09 — No payment at check-in, but payment at check-out
**Symptom.** A hotel wants guests to pay at reception on arrival but still check out online and pay the balance then; asks which option to untick.
**First checks.** Which tab they are editing (check-in or check-out); current state of "Enable online payments" and "Enable on arrival payments".
**Typical cause.** Not a fault — a configuration question.
**Owner.** Acme Support.
**Fix or answer.** Configure the check-in tab and the check-out tab separately; disabling online payments leaves the on-arrival button; with on-arrival payments off, guests still order and pay at the reception.
**Also asked as.** «отключить оплату при заезде, оставить оплату при выезде», "disable pre-arrival payment but keep check-out payment"
<!-- evidence: FW-062 -->

### T-APP-10 — View Bill error 9, or the guest cannot charge to the room
**Symptom.** The bill page shows "error 9: Data unavailable"; or an order errors when "charge to room" is chosen while card and cash work.
**First checks.** Screenshot with the error text; PMS interface status for the property; for the charge error, what the PMS sent for that guest (Posting deny or Posting allowed).
**Typical cause.** Error 9 — our side, fixed by R&D. Charge error — the PMS flag Posting deny on the guest profile.
**Owner.** R&D (error 9); hotel front office and the PMS vendor (Posting deny).
**Fix or answer.** Error 9 → R&D, confirm the fix with the hotel. Posting deny → the PMS must send Posting allowed; nothing to change in the app.
**Also asked as.** «не открывается счёт, ошибка 9», «нельзя оплатить на счёт номера», "View Bill error 9 Data unavailable", "charge to room not available"
<!-- evidence: FW-191, FW-217 -->

### T-APP-11 — No payment-method choice when ordering from the TV
**Symptom.** On the phone the guest chooses card or cash; ordering from the TV offers no choice.
**First checks.** Confirm the request is about the TV surface; whether the hotel needs a choice or only card payment.
**Typical cause.** By design — TV ordering has no payment-method choice.
**Owner.** Acme Support; product manager for the feature request.
**Fix or answer.** Offer the QR payment-gateway option (a QR code on the TV leads the guest to the gateway; still no method choice) or say it is not available; log the feature request without dates.
**Also asked as.** «нет выбора способа оплаты при заказе с ТВ», "no payment method choice when ordering from the TV"
<!-- evidence: FW-140 -->

### T-APP-12 — The guest app loads slowly
**Symptom.** The WebApp or native app takes 30–60 seconds to open, on mobile data and on hotel Wi-Fi alike; or it opens only on the guest Wi-Fi.
**First checks.** Our own load test over mobile data (typically 10–20 s cold); their tests from two mobile operators and hotel Wi-Fi in incognito; a screencast with timing; hotel-side blocking of the address.
**Typical cause.** Network conditions or a hotel/ISP filter; a heavy front-end bundle when the complaint is technical and consistent.
**Owner.** Acme Support (measure); hotel IT (blocking); R&D (front-end optimisation, no dates).
**Fix or answer.** Share our measurement, collect theirs, and forward consistent, evidenced slowness to R&D as an improvement request.
**Also asked as.** «приложение долго грузится», «веб-портал гостя открывается около минуты», "guest app is slow to load", "web app takes 30–60 seconds"
<!-- evidence: FW-063, FW-178 -->
