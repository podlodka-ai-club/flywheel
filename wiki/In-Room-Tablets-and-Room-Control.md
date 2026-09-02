<!-- meta
id: in-room-tablets-and-room-control
type: product
audience: support
tags: [tablet, bsp, roomconnect, apk, check-in popup, tv control, mas, raspberry pi, rcu, grms, room control, dimmer, firmware, webview, service page]
-->

# In-Room Tablets and Room Control

**Read this when:** a partner reports an in-room tablet (BSP / RoomConnect) misbehaving — no check-in popup, TV control lost, AC or lights doing the wrong thing, language reset, links erroring — or Room Control from the TV failing in a room.

---

## 1. What runs in the room

### BSP / RoomConnect and its APK

The in-room tablet runs the BSP application (partners also say RoomConnect); it is an Android APK, and reports quote versions such as v900 or 2.1.960 — always ask for the version (gate Q-005 in [Ticket Intake Checklist](Ticket-Intake-Checklist)). The tablet shows the same content set as the TV and the Guest App, lets the guest order, message, control the TV and the room, and receives the check-in popup. Tablets are licensed separately from TVs — TV and Cast licences are separate counts and tablets are counted on their own ([Licensing and Commercial Requests](Licensing-and-Commercial-Requests)). A tablet must be assigned to a room: an unassigned one shows "Room not set", and a photo of a fault taken in a vacant, unset room is fine for illustration but not for reproduction — ask for a retest in a room with a set status when the behaviour could depend on it.
<!-- evidence: FW-023, FW-054, FW-048 -->

### The service page on a tablet

On a tablet the diagnostic page is opened by tapping the room number repeatedly until a popup appears, then entering 1800; photograph the Network, Device and Authorization sections — that is the standard first ask, the same as on a TV ([Acme TV](Acme-TV)). A browser session logged in as the room shows content only: it cannot open the service page and cannot place test orders, so "1800 does nothing" from a browser is expected. Orders, service requests and the service page are tested on the physical tablet in a vacant room.
<!-- evidence: FW-073 -->

## 2. Check-in popup logic

### How the popup is generated and delivered

About one minute after a check-in the tablet shows the check-in popup (a marketing notification). The logic lives in the cloud, not on the device: the notification is generated and stored in our cloud, and each guest's notification carries a "delivered" flag — once at least one device has received and displayed it, the cloud deletes it so a guest with several devices is not spammed. With several tablets in a room: if all of them are online when the cloud generates the popup, all show it; otherwise only the device that was online at that moment shows it. A tablet stuck on the white check-in screen saw the room status change but never received the popup. Ask whether it happens in every room or randomly, test the room in a web browser, and confirm both tablets were online at generation. A room where no tablet showed the popup is not explained by this rule — collect the room, the check-in time and the APK version, and hand it to R&D.
<!-- evidence: FW-023 -->

## 3. TV control from the tablet

### TV On/Off and control lost after CMS changes

The tablet's TV control page (TV On / TV Off, in the Control section) sends remote commands to the room TV through our cloud. When control is lost after CMS changes, the recovery order is: reboot the TV, check; if still dead, refresh the content on the tablet by rebooting the tablet. A property losing control of all TVs after every CMS update is not a per-room fault: as of August 2026 the known cause was the cloud provider blocking remote commands from our North America region; commands were temporarily routed through the EU region and returned to North America once recovered ([Known Issues and Release Notes](Known-Issues-and-Release-Notes)). Report a recurrence as an incident with the time of the change and the number of rooms.
<!-- evidence: FW-188 -->

### The 2.1.960 "TV On" bug

BSP APK 2.1.960 shipped with "Turn On" / "TV On" in the Control section not powering the TV on. It affected several tablets and more than one property of the same partner, which makes it a product bug (trigger E-008 in [Escalate or Answer](Escalate-or-Answer)); R&D reproduced it in the lab and a fixed APK was promised for the next release. The button does not depend on the room-set status, so a screenshot from a "Room not set" tablet is acceptable evidence here. When the partner asks whether the new APK resolves it, ask them to confirm on one tablet after updating; this and other version-specific issues are tracked in [Known Issues and Release Notes](Known-Issues-and-Release-Notes).
<!-- evidence: FW-048, FW-054 -->

## 4. MAS room automation

### AC control: temperature and fan speed change together

MAS is the room-automation module on a Raspberry Pi that the tablet talks to for AC, lights and the default language. AC control from the BSP sends temperature and fan speed together: on any change the tablet first reads the current status from the MAS and then sends the updated pair. If the MAS answers slowly, a stale value goes back with the command, so changing the fan speed sometimes changes the temperature and vice versa. Ask for a video and the list of affected rooms, separate it from the Celsius/Fahrenheit increment behaviour (a different item), and hand the request to split the commands (fan-only, temperature-only) to R&D together with the MAS vendor.
<!-- evidence: FW-042 -->

### Default language after a Pi card replacement

When a Pi is replaced with a new memory card, the tablet language can switch to another language on its own: the MAS default language on that card was not set to the property's language. A command was added to the Pi update script to force the default language to English during the update, which stops the recurrence. The language button appears in the BSP once languages are enabled for the property, and the guest switches between the enabled languages; without it the only workaround has been toggling the language from an older tablet. Interface languages are enabled per property in the admin panel ([Admin Panel and CMS](Admin-Panel-and-CMS)).
<!-- evidence: FW-042 -->

## 5. RCU and GRMS

### Room Control from the TV goes through the GRMS vendor

Room Control on Acme TV (lights, curtains, climate) sends commands to the third-party GRMS through its RCU. When it fails in one room but works elsewhere, our logs show the errors returned by the vendor side for that room — intermittent errors appear for many rooms, a persistently high count for one room marks the room to fix. Attach the log extract and ask the partner to raise it with the GRMS vendor; we do not repair the vendor's controllers. Ask whether the fault is all rooms or one, all devices or one device type (for example only the Light Dimmer RCU type).
<!-- evidence: FW-074, FW-058 -->

### Dimmer lights switch OFF but not ON from the TV

Dimmable lights can be switched OFF from the TV with the Volume Down key but not back ON, while the same lights work from the Guest App: the fault is in the TV app's handling of that RCU type, not in the GRMS. The fix is a TV app update delivered by the test-folder method — the new version goes into a separate folder with an internal test URL, the hotel points one TV in a vacant room at it, staff test, and only then the whole property is updated ([Updates, Maintenance and Change Control](Updates-Maintenance-and-Change-Control)). Ask the hotel for a room that is ready and stays vacant; if the test TV still fails after a reboot, send it back to R&D with the room and the app version.
<!-- evidence: FW-058 -->

## 6. Tablet firmware and webview issues

External links opened inside the tablet (table-booking pages behind "Book a table", PDF menus) can show an error after the page appears for half a second, while the same links open normally in the Guest App and on a computer, and some links on the same tablet work. This is a webview bug in the tablet vendor's firmware: R&D reproduces it and we wait for a fixed firmware from the vendor — there is no content-side fix, so do not have the partner re-enter the links. Give the partner the vendor status, no date, and keep the ticket On Hold until the firmware arrives.
<!-- evidence: FW-030 -->

## 7. Legacy tablet content

Old tablets carry a city-guide page — tapping the city opens a map with ATMs, restaurants, the hotel and things to do. On new tablets the item may show nothing and restart the application, and the new CMS has no option to create a guide page, because that page was configured technically on the old tablets rather than as content. The partner cannot add it themselves; ask R&D whether the page can be provided on the new tablet, and treat the rest of the rollout as unaffected.
<!-- evidence: FW-024 -->

## 8. Testing from tablets

Test orders and service requests must be placed from a tablet (or TV) in a vacant room; the same tablet is where you open the service page (repeated taps on the room number, then 1800) and read the APK version. Orders placed from a browser never reach the admin panel or the task tracker, which is a limitation, not a fault — the team is working on ordering from the browser version. Before a test, confirm the tablet's room is set and the room is vacant, and cancel the test order afterwards ([In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App)).
<!-- evidence: FW-073 -->

## 9. Triage rows

### T-TAB-01 — Check-in popup shown on one of two tablets, or on none
**Symptom.** After check-in one tablet shows the popup and the other stays on the white check-in screen; sometimes neither shows it.
**First checks.** APK version; every room or random rooms; were both tablets online about one minute after check-in; the room in a web browser; the check-in time.
**Typical cause.** By design when only one device was online at generation — the cloud marks the guest's notification delivered after the first display. A room with no popup on any tablet is unexplained and goes to R&D.
**Owner.** Acme Support (explain); R&D (no-popup rooms).
**Fix or answer.** Explain the delivered-flag logic; collect room, time and version for the unexplained cases.
**Also asked as.** «попап заселения показывается только на одном планшете», "check-in popup on one of two tablets"
<!-- evidence: FW-023 -->

### T-TAB-02 — Test orders never arrive; 1800 does nothing
**Symptom.** Orders or service requests placed for a test room do not appear in the admin panel, the task tracker or the tablet's history; entering 1800 opens nothing.
**First checks.** Is the test done from a browser logged in as the room? Do orders from other rooms arrive today? Any error shown on send?
**Typical cause.** Testing from a browser — content only, no orders, no service page.
**Owner.** Acme Support.
**Fix or answer.** Place the test order from the physical tablet in the vacant room; ordering from the browser version is a temporary limitation being worked on.
**Also asked as.** «тестовый заказ не доходит до админки», «сервисная страница 1800 не открывается», "test orders don't reach the admin panel", "1800 does nothing on the tablet"
<!-- evidence: FW-073 -->

### T-TAB-03 — TVs cannot be controlled from the tablet after CMS changes
**Symptom.** After a CMS change the TV no longer reacts to the tablet; often all TVs in the property, recurring after every update.
**First checks.** One room or all; what was changed and when; reboot the TV; then reboot the tablet to refresh content.
**Typical cause.** Stale content on the tablet after the change; a property-wide loss pointed to blocked remote commands from the North America region (incident, recovered).
**Owner.** Acme Support; R&D and the cloud provider for the regional routing.
**Fix or answer.** Reboot the TV, then the tablet; if property-wide and recurring, escalate as an incident with times and room count.
**Also asked as.** «не управляется телевизор с планшета после изменений в CMS», "lost TV control from BSP after a CMS update"
<!-- evidence: FW-188 -->

### T-TAB-04 — "TV On" / "Turn On" does nothing on BSP 2.1.960
**Symptom.** Pressing TV On in the Control section does not power the TV on; reported on several tablets at once.
**First checks.** APK version; several tablets; more than one property; the TV powers on by other means (remote, PMS check-in).
**Typical cause.** Known bug in APK 2.1.960.
**Owner.** R&D.
**Fix or answer.** Confirm it is known, fix in the next APK; ask the partner to confirm on one tablet after updating.
**Also asked as.** «кнопка TV On не работает на BSP 2.1.960», "Turn On in the Control section does nothing"
<!-- evidence: FW-048, FW-054 -->

### T-TAB-05 — Changing the fan speed changes the temperature (and vice versa)
**Symptom.** On the tablet's AC page, a fan-speed change sometimes alters the set temperature, and a temperature change alters the fan speed.
**First checks.** Video; list of rooms; whether the property is waiting for reprogrammed MAS units; rule out the Celsius/Fahrenheit increment question.
**Typical cause.** The BSP sends temperature and fan speed together after reading the current status from the MAS; a slow MAS answer sends a stale value back.
**Owner.** R&D with the MAS vendor.
**Fix or answer.** Escalate with the video; the requested change is to send fan-only and temperature-only commands; no date.
**Also asked as.** «при смене скорости вентилятора меняется температура», "changing fan speed changes the temperature"
<!-- evidence: FW-042 -->

### T-TAB-06 — Tablet language resets or no language option
**Symptom.** After a Pi memory-card replacement the tablet shows another language; there is no language button in the UI to switch back.
**First checks.** Was the Pi or its card replaced; languages enabled for the property; which tablets show the button.
**Typical cause.** MAS default language on the new card; the language button hidden because languages were not enabled.
**Owner.** Acme Support (enable languages); deployment team for the Pi update script.
**Fix or answer.** Enable the languages so the button appears; the Pi update script now forces the English default during updates.
**Also asked as.** «язык на планшетах сбрасывается», «нет кнопки выбора языка», "tablet language switched by itself", "no language option on the tablet"
<!-- evidence: FW-042 -->

### T-TAB-07 — Room Control from the TV fails in one room
**Symptom.** Lights or climate control from the TV does not work in one room; works elsewhere; the GRMS side sees nothing unusual.
**First checks.** Our logs for vendor-side errors for that room; compare error counts across rooms.
**Typical cause.** Errors returned by the GRMS vendor's integration for that room's controller.
**Owner.** GRMS vendor via the partner; Acme Support supplies logs.
**Fix or answer.** Send the log extract and ask the partner to raise it with the vendor; note that intermittent errors elsewhere are not persistent.
**Also asked as.** «Room Control не работает с телевизора в одном номере», "Room Control fails from the TV in one room"
<!-- evidence: FW-074 -->

### T-TAB-08 — Dimmer lights switch OFF but not ON from the TV
**Symptom.** Volume Down turns the dimmable lights off from the TV, but they cannot be turned on; the Guest App controls them fine.
**First checks.** All rooms; only the Light Dimmer RCU type; TV app version.
**Typical cause.** TV app handling of that RCU type.
**Owner.** R&D; the hotel provides a vacant test room.
**Fix or answer.** Test-folder TV app update on one TV with the internal test URL, then property-wide; if the test still fails after a reboot, back to R&D.
**Also asked as.** «диммируемый свет не включается с пульта», "dimmer lights won't turn on from the TV"
<!-- evidence: FW-058 -->

### T-TAB-09 — Booking links or PDF menus error on the tablets
**Symptom.** Some "Book a table" links or PDF menus show an error after half a second on the tablet; the same links work outside it.
**First checks.** Screenshot of the tablet error; whether the links open in the Guest App and on a computer; tablet model and firmware.
**Typical cause.** Tablet firmware webview bug.
**Owner.** Tablet vendor (firmware) via R&D.
**Fix or answer.** No content fix; wait for the vendor's firmware; keep On Hold, no date.
**Also asked as.** «ошибка при открытии ссылок бронирования на планшетах», «PDF-меню не открывается на планшете», "booking links error on the in-room tablets", "PDF menu shows an error on the tablet"
<!-- evidence: FW-030 -->

### T-TAB-10 — City guide missing or crashing on the new tablet
**Symptom.** The city-guide item shows nothing and restarts the app on new tablets; there is no way to add a guide page in the new CMS.
**First checks.** Whether old tablets still have it; tablet model and APK.
**Typical cause.** A legacy page configured on the old tablets, not reproducible as content in the new CMS.
**Owner.** R&D and the product manager.
**Fix or answer.** The partner cannot add it; ask R&D for options; do not block the rollout on it.
**Also asked as.** «на новом планшете нет городского гида, приложение перезапускается», "city guide missing on the new tablet, app restarts"
<!-- evidence: FW-024 -->
