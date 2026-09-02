<!-- meta
id: in-room-ordering-and-staff-app
type: product
audience: support
tags: [orders, in-room dining, room service, service requests, shop orders, notifications, overdue, mailgun, working hours, payments, pos, flexkeeping, hotsos, staff app, reports]
-->

# In-Room Ordering and Staff App

**Read this when:** a partner or hotel reports anything about guest orders — missing, late or duplicated notifications, statuses that will not change, menus and working hours, payments, POS or task-tracker integration, the Acme Staff app, or order reports.

---

## 1. Order model

### Shop Orders vs Service Requests

Guests place two kinds of orders from the TV, the Guest App or an in-room tablet. **Shop Orders** are in-room dining and shop purchases with items, quantities, options and a price. **Service Requests** are housekeeping, laundry and dry cleaning, spa, tray removal and similar requests with a date and time rather than a basket. Both follow the same statuses: **New → Confirmed → Completed**, or **Cancelled**. While an order is New the guest can still cancel it; once it is Confirmed the guest no longer can. A report that does not say which type is affected gets one question first — "Shop Order or Service Request? send a screenshot" — because notifications, reports and integrations are configured per type. Content for menus and services carries device types (TV, WEB, GUESTAPP), so an item can exist on the TV and be absent in the app ([Guest App](Guest-App)).
<!-- evidence: FW-155, FW-056, FW-196 -->

### Who changes the status, and where

Hotel staff process orders in the old admin panel, in the new admin panel, or in the Acme Staff app. Every incoming order must be accepted (Confirmed) and, once delivered, set to Completed — or rejected (Cancelled). Orders left in New are "unprocessed": they trigger overdue reminders and colour the order list red, and a backlog of them is the usual reason for "we keep getting delay e-mails". Confirming in the old panel applies instantly; in the new panel the guest's cancel option has stayed visible until a page refresh — R&D has it. When the Completed button is not visible for a user, support completes the orders on request, but the answer to give is that the new admin panel is self-service for statuses; if a user cannot change a status at all, ask for their login and a short video (an error, or the status silently not changing) — rights are the first suspect.
<!-- evidence: FW-196, FW-195, FW-207, FW-056 -->

## 2. Notifications

### E-mail delivery: Mailgun, "Delivered", spam, overdue reminders

Order notification e-mails go out through Mailgun. Support can open the Mailgun log and see the "Delivered" status per address — quote it, and ask the hotel to check spam before anything else. Two kinds exist: the **instant** notification on a new order (and on a new guest message, when instant notifications are enabled for the property) and the **overdue** reminder for orders nobody has processed. Overdue reminders repeat until the order is Confirmed and Completed; that is by design, and configurable notification settings are planned — do not promise a date. Partners regularly ask for reminders to stop at Confirmed, or to start 15 minutes after the order; neither is configurable today. If a hotel says reminders stopped, or that e-mails reach one mailbox but not another, ask for a concrete order and time that should have produced an e-mail and check that order in the log.
<!-- evidence: FW-053, FW-016, FW-043 -->

### Per-user notification settings and filtering

Who receives what is set per user: **Staff list → Edit user → Notification page** for the notification types (including order cancellation alerts), plus the services ticked in the user profile — In-Room Dining, Tray Removal, spa and so on. Two symptoms come from this screen. A user receiving notifications for a service they should not see (a spa order reaching an In-Room Dining user): notification filtering is enabled by support, then the partner verifies that only the needed services are ticked in the profile. Room-service staff not seeing in-room dining orders at all: the In-Room Dining option was not ticked in their profile — tick it, save, and have them log in again. The old panel does not always show these pages to the partner; the new admin panel is self-service for notifications and staff, so point them there rather than editing on their behalf.
<!-- evidence: FW-139, FW-038, FW-225 -->

### Delays, duplicates, silent alerts, and the other channels

E-mail is one channel; a Telegram bot and push notifications in the Acme Staff app are the others, and Staff-app push needs the latest app version. Always ask which channel the hotel is watching. E-mails arriving 30 minutes late and several times with identical content, or an order reaching the task tracker an hour after creation, have matched short cloud-infrastructure incidents: confirm the incident window, apologise, and ask them to reopen if it recurs. A notification that arrived but played no sound is a browser or OS matter — we send the order, the browser plays the sound. Checklist for the hotel: the tab is not muted, the site is allowed to play sound, the right output device is selected, background-tab audio is not blocked, ad-blockers and privacy extensions are disabled for the panel, and the console shows no NotAllowedError or AudioContext errors. Ask for a reproducible pattern before involving R&D.
<!-- evidence: FW-155, FW-150, FW-237, FW-047, FW-033 -->

## 3. Menus and working hours

### Working hours per menu or section

Working hours are set per menu or section (a day menu and a night menu can have their own ranges). Outside the hours "As Soon As Possible" is unavailable and the guest can only pick a delivery time inside the hours, so the order is scheduled to the nearest available slot — long-standing behaviour. There is no disclaimer telling the guest that the order will be delivered later; a notification for orders placed outside working hours is in the R&D backlog. Hiding a whole section on a schedule (night menu invisible by day) is not possible; restricting its ordering hours is the alternative. If night-menu items can still be added to the cart during the day in the WebApp, that is a bug: reproduce, screenshot, R&D. If the hours shown in the app do not match the CMS, check the saved value, publish, and verify on the TV and in the WebApp.
<!-- evidence: FW-159, FW-036, FW-197 -->

### Items, options, prices, PDF menus and the service charge

Items carry options and toppings (dry-cleaning services with "choose options", paid add-ons on a dish). An option that opens in the app but does nothing on the TV, or an add-on that is priced correctly on the TV but arrives with a zero price when ordered from the phone, is a product bug: collect admin-panel screenshots of both orders and hand it to R&D — a release of another application has touched the order module before. PDF menus (restaurant, bar, breakfast) are added by the content managers on request; say which account or level should carry them, and attach the files. The service charge is a percentage set in the CMS by the hotel and then published; when a fixed amount is being added instead of the percentage, the hotel changes the parameter itself and publishes. Prices and SKUs may come from a POS — see section 5.
<!-- evidence: FW-056, FW-245, FW-225, FW-113 -->

## 4. Payments

### Payment methods by surface

An order can be paid online, on arrival, or at the reception, and stays can be paid at check-in or at check-out. The switches are **Enable online payments** and **Enable on arrival payments**, with separate tabs for check-in and check-out; disabling online payments leaves the on-arrival button, and with on-arrival payments off the guest still orders and pays at the reception. On the phone the guest chooses card or cash; ordering from the TV offers no payment-method choice at all — the only option is the QR payment gateway, where the TV shows a QR code that takes the guest to the gateway, again without a choice. Charging to the room is blocked when the PMS sends **Posting deny** for the guest; the PMS must send Posting allowed ([PMS Integration](PMS-Integration)).
<!-- evidence: FW-062, FW-140, FW-217 -->

### Paid/unpaid mismatches and orders lost after payment

An order shown as unpaid in our panel while the PMS shows it paid goes to R&D with the order number and both screenshots; do not change the status by hand. A guest who paid online but has no order is E-003 in [Escalate or Answer](Escalate-or-Answer): the seen pattern is two payment links created for one order — the first stayed unpaid and the order was cancelled, the second was paid, and the guest's account shows no order. Collect the order number, the payment-module reference and status, the timestamps of both links, and — from the payment partner — the API request and response for the status update, then hand the case to R&D the same day.
<!-- evidence: FW-064, FW-088 -->

## 5. Integrations

### POS

With a POS integration the item list is synchronised from the POS: SKUs are received automatically, so a new item must be created on the POS side first — there is no manual sync to run. "cURL Error: Operation timed out after 30000 milliseconds" on an order means the cloud platform got no answer from the POS in time; that is a network problem between the cloud and the POS — check the connection and ask hotel IT if it repeats. A POS error saying ordering for the room is locked means a workstation has the same table open; the POS does not allow the workstation and the API to use one table at once, and the order goes through once the workstation leaves the table. The POS vendor's advice is a separate table numbering scheme for app orders; the hotel decides that on a call with the vendor and us. Other POS errors on send: order number, screenshot, time → R&D. Guest notes reaching the kitchen incomplete (an allergy cut off on the printout or task) is the safety trigger E-004 in [Escalate or Answer](Escalate-or-Answer), whichever side truncates.
<!-- evidence: FW-227, FW-153, FW-248 -->

### Task trackers: Flexkeeping, HotSOS, Treema, and the callback domain

Service requests can be pushed to a task tracker. **Flexkeeping**: the platform has no priority entity — all guest orders are treated as top priority — so a "send tasks as HIGH priority" request cannot be met on our side. **HotSOS**: errors when the Complete status is sent from the CMS have needed R&D to capture real orders (see section 8). **Treema** receives orders like the panel does. After a short outage an order can sit in New here while the tracker shows it Completed: we complete it manually and R&D works on preventing the failure. Orders reaching the tracker an hour late have matched cloud-infrastructure delays. When accepted orders never change status and delay e-mails keep coming although staff work the tracker, ask which domain the tracker posts statuses to: hotels in Russia must send status callbacks to the Russian API domain, hotels elsewhere to the international one ([PMS Integration](PMS-Integration) has the same rule).
<!-- evidence: FW-242, FW-135, FW-073, FW-065, FW-196 -->

## 6. Staff app

### Acme Staff: version, server, logouts

Acme Staff is the staff mobile app for orders, service requests and guest messages. First answer to almost every Staff-app report: install the latest version from the store — it fixed the unresponsive "Yes, cancel order" button and is where new orders and their alerts are re-checked when they only appear after a manual refresh. Users must choose the **Europe** server at login. Random logouts followed by "incorrect password" for a correct password, cleared by retrying or by resetting the password in the CMS, are escalated to R&D with a video or screenshot from the next occurrence; a cloud-provider outage has been suspected, and the pattern can recur months apart. Messaging can be made one-way (hotel writes, guest cannot reply) — confirm with the partner before disabling two-way chat.
<!-- evidence: FW-033, FW-085 -->

## 7. Reports

Statistics on what guests ordered live in the admin panel under **Reports → Shop Reports** and **Service Reports**; the new admin panel also has **Sales reports** in its Reports block. Send a screenshot of the section and say which panel it is from — hotels are being moved to the new panel gradually and mix the two up. If a partner asks for numbers these reports do not show, pass the request to the product manager as a feature request, without dates.
<!-- evidence: FW-222 -->

## 8. Testing orders

Test orders are placed from a tablet or a TV in a vacant room, never from a browser: a browser session shows content only, cannot open the service page, and its orders do not reach the admin panel or the task tracker — a partner "testing from the browser under the test room" is seeing exactly that, not a fault (ordering from the browser version is being worked on). When R&D is capturing an integration problem, they ask for an order from a real room left untouched in the admin panel: share the order number, do not change its status until R&D says so, then cancel it. A flood of service requests nobody sent (cancel-cleaning requests every couple of minutes, guests deny sending them) goes to R&D with the channel they arrive on; support can cancel the accumulated requests to make a clean test, and a TV app update is trialled on one TV first ([Updates, Maintenance and Change Control](Updates-Maintenance-and-Change-Control)).
<!-- evidence: FW-073, FW-135, FW-047 -->

## 9. Guest request history

After ordering, the guest sees the request in their history with its creation time; for a service request the chosen parameters (date and time of the cleaning, options) are not shown. A request to display full details for every request type is a feature request that R&D has queued without dates — answer accordingly. A related bug: an order that disappears from the guest's cart after a language change or an app restart is with the development team; collect the surface (TV or app), the language switched to, and a video.
<!-- evidence: FW-249, FW-056 -->

## 10. Triage rows

### T-ORD-01 — Overdue e-mails keep coming after the order was confirmed
**Symptom.** Staff confirmed an order, but reminder e-mails continue until it is completed; or the hotel asks to stop reminders at Confirmed, or to start them 15 minutes after the order.
**First checks.** The order's current status (Confirmed only, or Completed?); how many orders sit unprocessed for the property.
**Typical cause.** By design: overdue reminders repeat until the order is Confirmed and Completed.
**Owner.** Acme Support; product manager for the setting.
**Fix or answer.** Ask staff to complete orders after delivery; say that configurable notification settings are planned, without a date.
**Also asked as.** «уведомления о просроченном заказе продолжают приходить после подтверждения», "overdue emails keep arriving after the order is confirmed"
<!-- evidence: FW-016, FW-196 -->

### T-ORD-02 — No order notifications, or reminders stopped
**Symptom.** Staff say new-order or overdue e-mails no longer arrive, or reach one mailbox but not the other.
**First checks.** Mailgun log — "Delivered" per address; spam folder; instant notifications enabled for the property; a concrete order and time that should have produced an e-mail; which channel they watch (e-mail, Telegram bot, Staff app).
**Typical cause.** Delivered but filtered as spam; the user's notification settings; or no order actually met the overdue condition.
**Owner.** Acme Support; R&D only with a delivered-but-missing example.
**Fix or answer.** Report the delivery status, ask for the spam check, and request the example before escalating.
**Also asked as.** «не приходят уведомления о заказах», «письма не доходят на обе почты», "no order notifications", "overdue notifications stopped arriving"
<!-- evidence: FW-043, FW-053 -->

### T-ORD-03 — A staff user gets the wrong notifications, or sees no orders
**Symptom.** A user limited to In-Room Dining and Tray Removal receives spa order notifications; or room-service staff cannot see in-room dining orders.
**First checks.** The user's profile: services ticked; Staff list → Edit user → Notification page; which panel the user works in.
**Typical cause.** Notification filtering not enabled, or the service (In-Room Dining) not ticked in the profile.
**Owner.** Acme Support (enable filtering); the partner in the new admin panel (self-service).
**Fix or answer.** Enable filtering, correct the ticked services, ask the user to log in again; show the partner where to do it themselves in the new panel.
**Also asked as.** «сотрудник получает уведомления о чужих услугах», «рум-сервис не видит заказы», "staff user gets spa notifications", "room service can't see in-room dining orders"
<!-- evidence: FW-038, FW-225, FW-139 -->

### T-ORD-04 — Notification e-mails delayed or duplicated; task reached the tracker late
**Symptom.** The first e-mail arrives 30 or more minutes after the order, followed by identical copies; or the task tracker shows the order an hour after creation.
**First checks.** Screenshot — Shop Order or Service Request; exact times; whether a cloud incident was open in that window; whether it still happens now.
**Typical cause.** A short cloud-infrastructure delay in notification or integration delivery.
**Owner.** R&D and the cloud provider; Acme Support communicates.
**Fix or answer.** Confirm the incident window, apologise, verify current delivery, and ask them to reopen a ticket if it recurs.
**Also asked as.** «письма о заказах приходят с задержкой и дублируются», «заявка попала в таск-трекер с опозданием», "order emails delayed and duplicated", "task appeared in the tracker an hour late"
<!-- evidence: FW-155, FW-150 -->

### T-ORD-05 — A notification arrived without sound
**Symptom.** Sound alerts are on, most orders ring, an occasional one arrives silently.
**First checks.** Was the notification delivered (yes means it is not a delivery problem); browser tab muted; site allowed to play sound; output device; background-tab audio; extensions; console errors (NotAllowedError, AudioContext).
**Typical cause.** Browser or OS audio handling on the hotel's computer.
**Owner.** Hotel IT.
**Fix or answer.** Send the checklist; we do not control browser sound playback; ask for a reproducible pattern before R&D.
**Also asked as.** «уведомление пришло без звука», "some notifications arrive silently"
<!-- evidence: FW-237 -->

### T-ORD-06 — The Completed button is missing; "please complete this order"
**Symptom.** Staff cannot set an overdue order to Completed because the button is not shown; they ask support to do it.
**First checks.** Which panel and which user; the order status and type.
**Typical cause.** The old panel or the user's rights hide the action; the new admin panel exposes it.
**Owner.** Acme Support.
**Fix or answer.** Complete the listed orders, then tell them statuses are changed by the hotel itself in the new admin panel.
**Also asked as.** «не отображается кнопка Выполнено», «переведите заказ в статус Выполнено», "the Completed button is missing", "please mark this order as completed"
<!-- evidence: FW-195, FW-207 -->

### T-ORD-07 — Statuses do not update after accepting; everything is red; delay e-mails
**Symptom.** Staff accept and complete orders in their order system, the status stays New on our side, the list is highlighted red and overdue e-mails keep coming.
**First checks.** How many orders are unprocessed; the logins used and their rights; a video of the status change (error or silent); which API domain the partner's system sends status callbacks to.
**Typical cause.** Orders genuinely unprocessed; or the integration posts statuses to the wrong regional domain (international instead of Russian for a hotel in Russia).
**Owner.** Acme Support; the order-system vendor for the callback URL.
**Fix or answer.** Process the backlog; have the vendor switch the callback domain to the regional API domain; verify new orders update.
**Also asked as.** «статусы заказов не обновляются, приходят письма о задержке», «в приложении всё горит красным», "order statuses don't update after accepting", "everything is red in the order panel"
<!-- evidence: FW-196 -->

### T-ORD-08 — Items orderable outside working hours, no disclaimer, hours not updating
**Symptom.** A night-menu item can be added to the cart by day; guests order outside hours without noticing the scheduled time; the hours shown differ from the CMS.
**First checks.** Surface (TV, WebApp, native app); the menu or section hours saved and published; whether ASAP is offered or only a time slot.
**Typical cause.** Scheduling to the nearest slot is by design; a section that ignores its hours is a bug; unpublished or unsaved hours.
**Owner.** Acme Support; R&D for the bug and the disclaimer backlog item.
**Fix or answer.** Explain nearest-slot scheduling and that a disclaimer is in the backlog; hiding a section on a schedule is not possible; fix and publish hours; reproduce bugs and escalate.
**Also asked as.** «можно заказать блюдо вне рабочего времени», «нет предупреждения о нерабочих часах», "night menu orderable during the day", "no disclaimer outside working hours"
<!-- evidence: FW-036, FW-159, FW-197 -->

### T-ORD-09 — Wrong order total on the phone, options that do not open, service charge
**Symptom.** A paid add-on is priced correctly from the TV but zero from the phone; "choose options" does nothing on the TV; a fixed amount is added instead of the service-charge percentage.
**First checks.** Admin-panel screenshots of both orders; item and option configuration; the service-charge parameter in the CMS.
**Typical cause.** Product bugs in the order module (R&D); the service charge is hotel configuration.
**Owner.** R&D (prices, options); the hotel via the CMS (service charge).
**Fix or answer.** Escalate price and option bugs with evidence, no dates; the hotel sets the percentage in the CMS and publishes.
**Also asked as.** «добавка уходит в заказ с нулевой ценой», «опции не открываются на ТВ», «сервисный сбор в процентах», "add-on price is zero in the mobile order", "options don't open on the TV"
<!-- evidence: FW-245, FW-056, FW-113 -->

### T-ORD-10 — Payment status differs from the PMS; paid but no order
**Symptom.** Our panel says unpaid while the PMS says paid; or two payment links were created, the first unpaid one cancelled the order, the second was paid, and there is no order.
**First checks.** Order number; payment-module reference and status; timestamps of both links; the API request and response for the status update from the payment partner.
**Typical cause.** Status synchronisation failure between the payment module and the order — E-003.
**Owner.** R&D; Acme Support coordinates with the payment partner.
**Fix or answer.** Escalate the same day with the evidence; do not edit statuses by hand; keep the guest informed via the hotel.
**Also asked as.** «статус оплаты не совпадает с PMS», «оплата прошла, а заказа нет», "payment status says unpaid but PMS says paid", "paid via the second link but the order was cancelled"
<!-- evidence: FW-064, FW-088 -->

### T-ORD-11 — Order error for a No Post guest; no card or cash choice on the TV
**Symptom.** A guest gets an error when ordering to the room account ("it used to work with No Post"); or the TV offers no payment-method choice while the phone does.
**First checks.** What the PMS sent for the guest (Posting deny or allowed); the surface; whether QR gateway payment is enabled.
**Typical cause.** Posting deny from the PMS; TV ordering has no payment-method choice by design.
**Owner.** Hotel front office and the PMS vendor (Posting deny); product manager (feature request).
**Fix or answer.** The PMS must send Posting allowed; offer the QR payment gateway on the TV or say the choice is not available.
**Also asked as.** «ошибка при оформлении заказа, No Post», «нет выбора оплаты картой или наличными на ТВ», "order error for a No Post guest", "no cash or card choice on the TV"
<!-- evidence: FW-217, FW-140 -->

### T-ORD-12 — POS timeout, new SKUs missing, table locked
**Symptom.** "Error added order to POS = cURL Error: Operation timed out after 30000 milliseconds"; new F&B items not found in search; a POS error that ordering for the room is locked.
**First checks.** Connection between the cloud and the POS now; whether the item exists on the POS side; whether a workstation has the room's table open.
**Typical cause.** Network timeout; item not created in the POS; table lock by a workstation.
**Owner.** Hotel IT and the POS vendor; Acme Support verifies the connection.
**Fix or answer.** Timeout — check the connection, investigate if it repeats; SKUs — create on the POS first, they sync automatically; lock — close the table on the workstation or agree a separate numbering scheme with the vendor.
**Also asked as.** «ошибка POS при отправке заказа», «новые позиции не появляются в поиске», «таймаут cURL 30000», "POS timeout on orders", "new SKU codes not visible", "table locked by the POS"
<!-- evidence: FW-227, FW-153 -->

### T-ORD-13 — Task-tracker status errors; order New here, Completed there
**Symptom.** An error when the Complete status is sent to HotSOS; an order still New in our panel while the SOS logs say Completed; tasks arriving late.
**First checks.** Order number and time; whether an outage was open; the tracker in use; for HotSOS, a real-room order left untouched for R&D.
**Typical cause.** A failed status task after a short outage; an integration bug being reproduced by R&D; cloud delays.
**Owner.** R&D; Acme Support completes stuck orders manually.
**Fix or answer.** Complete the order manually, explain the outage, and follow up when R&D's prevention fix ships; for HotSOS errors provide the test orders R&D asks for.
**Also asked as.** «ошибка передачи статуса Complete в HotSOS», «заказ в статусе New, а в SOS выполнен», "Complete status error to HotSOS", "order stuck in New while the tracker shows Completed"
<!-- evidence: FW-135, FW-065, FW-150 -->

### T-ORD-14 — Flexkeeping wants tasks sent with a priority
**Symptom.** A hotel requires every task pushed to Flexkeeping to arrive as HIGH priority; Flexkeeping says the sending system must set it.
**First checks.** Confirm the integration is Flexkeeping and that the request is about priority, not about tasks failing to arrive.
**Typical cause.** Expectation mismatch — our platform has no priority entity.
**Owner.** Acme Support; Flexkeeping for priority handling on their side.
**Fix or answer.** Priority cannot be set from our side; all guest orders are treated as top priority; the hotel handles priority in Flexkeeping.
**Also asked as.** «Flexkeeping требует приоритет задач», "how do we set task priority for Flexkeeping"
<!-- evidence: FW-242 -->

### T-ORD-15 — Staff app: cancel button dead, no push, random logouts
**Symptom.** "Yes, cancel order" is not clickable; new orders appear only after a manual refresh; users are logged out and the correct password is rejected until it is reset in the CMS.
**First checks.** App version versus the store; the server chosen at login (Europe); a video or screenshot of the next occurrence; whether it affects several hotels.
**Typical cause.** Outdated app; wrong server; a session problem R&D links to cloud-provider outages.
**Owner.** Acme Support (version, server); R&D (logouts).
**Fix or answer.** Update and retest; select Europe; reset the password in the CMS to restore access; escalate recurring logouts with the video.
**Also asked as.** «кнопка отмены заказа в Staff-приложении не работает», «Staff app выкидывает и пишет неверный пароль», "cancel button unresponsive in the staff app", "staff app logs users out and rejects the password"
<!-- evidence: FW-033, FW-085 -->

### T-ORD-16 — Service requests nobody sent
**Symptom.** Requests (cancel cleaning, for example) arrive from rooms every couple of minutes, mixed with real ones; guests deny sending them.
**First checks.** Which channel they arrive on (e-mail, Telegram bot, Staff app); screenshots; affected rooms and times; recent TV app or CMS changes.
**Typical cause.** Under investigation as a product bug; logs may show nothing abnormal.
**Owner.** R&D.
**Fix or answer.** Escalate with the evidence, offer to cancel the accumulated requests for a clean test, and trial the TV app update on one TV before the property.
**Also asked as.** «из номеров приходят заявки, которые гости не отправляли», «ложные заявки на отмену уборки», "phantom housekeeping requests every few minutes", "guests didn't send these service requests"
<!-- evidence: FW-047 -->
