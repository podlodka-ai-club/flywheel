<!-- meta
id: guest-wifi-hsia
type: product
audience: support
tags: [hsia, wifi, guest wifi, mikrotik, gateway, captive portal, voucher, sms login, tariff, bandwidth, dhcp, vlan, access point, welcome back, hsia portal]
-->

# Guest Wi-Fi (HSIA)

**Read this when:** a ticket mentions guest Wi-Fi, HSIA, the captive portal, vouchers, SMS login, MikroTik or "gateway offline", slow internet, or devices in a room that cannot get online.

---

## 1. What HSIA is and where our responsibility ends

Acme HSIA is the guest internet service: one or two MikroTik gateways at the property (main + backup) plus the HSIA portal in our cloud (the admin side partners log into) and the captive portal guests see when they join the guest network. Guest identity for room-number login comes from the PMS link described in [PMS Integration](PMS-Integration); how we reach the gateway is in [Remote Access and Connectivity](Remote-Access-and-Connectivity).

### Ownership boundary: we run the gateway and the portal, the hotel runs the LAN
We are responsible for the MikroTik gateway(s) — configuration, monitoring, failover, firmware — and for the HSIA portal and the captive portal: login methods, tariffs, vouchers, SMS settings, texts and colours. Everything between the gateway and the guest belongs to the hotel or its network contractor: access points (TP-Link, Ruckus, HP and Zyxel all appear in tickets), switches, cabling, port and VLAN configuration, the ISP uplink and its public addresses, and DHCP unless it is served from our gateway. So "please reboot the equipment in room N" is a job for the contractor (the nearest access point), not for us; what we can do is confirm on the gateway whether clients associate and authenticate, and join a live test. When symptoms are room-level and the contractor is on the thread, hand over to them instead of promising a fix. On partner tickets confirm the property first (Q-001 in [Ticket Intake Checklist](Ticket-Intake-Checklist)).
<!-- evidence: FW-018, FW-071, FW-180, FW-220 -->

### The HSIA team and its service desk
Gateway-level work — router replacement and configuration migration, public IP changes, disabling an SSID, DHCP scope changes, configuration details, SMS gateway checks, root-cause reviews — is done by the HSIA team (network engineers), who track it in their own service desk. Support creates the task, tells the partner it was created, sets the Zoho ticket On Hold and relays the outcome; do not promise dates on their behalf. The HSIA desk sends automated notifications (request registered, "waiting for customer reply", resolved) that land in Zoho as new tickets with no technical content; partners' own service desks produce the same kind of traffic. Do not troubleshoot inside a notification ticket: link it to the real thread and resolve it. The HSIA desk auto-resolves a request after 2 days without a reply; the requester re-opens it by commenting — tell partners so when they ask why their request "was closed".
<!-- evidence: FW-001, FW-102, FW-103, FW-117, FW-118 -->

## 2. Gateways

### Main and backup gateway, failover and monitoring
Every property has a main and a backup MikroTik gateway; when the main one fails, traffic moves to the backup automatically. The Monitoring tab of the HSIA portal shows both gateways and their traffic, the Cluster tab shows which one is active right now. Our monitoring also sends warning notifications while a gateway is not reporting, so a partner may keep receiving warnings after the internet is back — say the device is under review rather than dismissing the alerts. A gateway firmware update triggers a switchover by design; guests keep their MAC/IP session and can still authenticate on the captive portal, so the guest impact is minimal. Where the TV network also passes through the gateway, a switchover or reboot can leave older LG TVs offline until they are power-cycled; mention it when a hotel plans gateway work.
<!-- evidence: FW-083, FW-112, FW-130, FW-166 -->

### Hung gateway: power cycle first, supout file for the root cause
"Gateway offline" with the router powered but unreachable, traffic shown as down in the portal and no internet in that building or tower: the device has hung. Someone on site power-cycles it and service normally returns within minutes; a hung gateway cannot be revived from our side. For a root-cause request the HSIA team needs a supout file collected on the device while it is still misbehaving. If it was completely unresponsive or has already been rebooted there is no supout, and the ordinary logs are rarely enough to name a cause — say so plainly, list the preventive measures applied (configuration optimisation across the gateways, closer monitoring) and keep the ticket open only if a follow-up action exists.
<!-- evidence: FW-166, FW-095, FW-108, FW-084, FW-097 -->

### WireGuard tunnel, router replacement, public addresses
Each gateway keeps a WireGuard tunnel to our cloud for HSIA monitoring and management. When that tunnel is down the portal loses contact with the device although the hotel's internet works; a reboot of the gateway is the first remedy, and reaching the TV server over our VPN proves nothing — gateway and TV server live in separate address spaces. Replacing a router (new device reachable on a temporary address, configuration migrated one-to-one, then swapped physically with the WAN address and default route re-pointed) and changing the public IP are HSIA-team tasks: set the ticket On Hold and expect days rather than hours. On the public side we only know the gateway's own addresses (a main and a backup public address on the router); wider ranges, SD-WAN subnets and anything else are for the ISP to confirm.
<!-- evidence: FW-007, FW-001, FW-103, FW-102, FW-220 -->

## 3. Login methods

### PMS login: room number + last name
The guest types the room number and the surname exactly as the PMS sent it — gendered endings and transliteration included; a mismatch gives "incorrect login information". The predictive mechanism forgives a single mistyped character (Activity shows "User Login - predictive"). Attempts made before the PMS check-in has reached us fail and are not a fault: the same guest logs in a few minutes later with the same details. If nobody can log in this way and the CMS shows no checked-in guests, the PMS link is down (interface stopped, server or VPN unreachable, webhook deactivated, cloud delay) — that is a [PMS Integration](PMS-Integration) ticket, and vouchers bridge the gap for waiting guests.
<!-- evidence: FW-187, FW-174, FW-083, FW-206, FW-031 -->

### Voucher, e-mail and reservation-number login
Vouchers are self-service: the partner generates them in the Vouchers section of the HSIA portal on a chosen plan — we point to the section rather than issuing codes ourselves. Vouchers expire; an expired voucher is the first thing to check when "the voucher does not work", and the fix is a new one. Vouchers are the standard answer for event attendees and for guests whose phones cannot receive SMS. The voucher option can be switched off for a property that wants PMS and SMS only. E-mail and reservation-number login exist as further methods; when they fail or the session keeps dropping, ask for a room number or the device MAC so the sessions can be inspected — such cases often clear before diagnosis starts. A bug in voucher creation goes to the HSIA team.
<!-- evidence: FW-211, FW-206, FW-172, FW-098, FW-093 -->

### SMS login
SMS login needs two things: the hotel's SMS gateway credentials (endpoint, username, password and the originator/sender name) entered in the property's SMS settings, and an SMS tariff in the portal — without a tariff there is no plan to put the guest on and login fails. When codes stop arriving, send a test SMS to your own number from the portal; if that fails too, the provider is not accepting our requests and the hotel must check its SMS provider account (balance, blocked originator, changed credentials) — "SMS worked yesterday and stopped this morning" has ended on the provider side. If the tariff is missing, recreate it and say so; we cannot tell who removed it.
<!-- evidence: FW-172, FW-068, FW-211 -->

### MAC whitelist, Welcome Back and MAC randomisation
MAC whitelisting has its own tariffs (authorization type MAC), separate from voucher plans, so a "faster plan" request may need both. Welcome Back re-authenticates a returning device by its MAC without asking for credentials again; the Sessions tab shows the interrupted session and the new one. It cannot work when the phone presents a randomised (private) address: the access history then shows a single record for the new MAC and no earlier login. That is device behaviour, not a defect — close as Won't Do and the guest logs in again.
<!-- evidence: FW-094, FW-083, FW-171, FW-180 -->

## 4. The HSIA portal

### Tabs: Activity, Cluster, Sessions, Monitoring
Activity lists authorization events (User Login, User Login - predictive and so on); the number beside an event opens the log filtered on that event. Cluster shows the gateway that is active right now. Sessions shows all sessions including finished ones — a guest who left coverage and came back is re-authorised by MAC and appears as a new session, so statistics count sessions, not guests. Monitoring shows the main and backup gateways with their traffic; "traffic dropped to zero" for a device is how a hung gateway looks here. Questions about total incoming/outgoing traffic figures and their meaning go to the HSIA team.
<!-- evidence: FW-083, FW-107, FW-166 -->

### Vouchers, tariffs, per-property settings, user accounts
Vouchers are generated by the partner per plan (see §3). Tariffs/plans are defined per authorization type (PMS, voucher, SMS, MAC), each with its speed cap; support creates new ones on request. Per-property settings include the bonus / in-house expiry time — when a session or in-house access expires; support changes it on request and confirms the value actually set (partners describe it as a clock time, we may hold it as hours). Rights such as voucher creation and viewing connected-device details are granted per user account: check the account before adding anything — it often already has the right — and ask for a screenshot if the function is not visible. Password reset works by e-mail link; when it never arrives, the account is probably registered to an old corporate mailbox: update the address and send a new link.
<!-- evidence: FW-142, FW-128, FW-127, FW-211 -->

## 5. Bandwidth and speed

### What actually caps a guest's speed
Three limits stack. The tariff of the authorization type the guest used — there are no per-port limits on the gateway, and we control nothing else in the path. The Wi-Fi link rate between the device and the access point — a 150 Mbps link never delivers more than 150 Mbps whatever the plan says. And the property's uplink, shared by everyone: upload and download travel over the same line, so per-user speed fluctuates with total load. Around 20 Mbps per guest is enough in practice even in large hotels; giving one guest a 150 Mbps tariff on a 300 Mbps line does not make anything faster. For a VIP or a specific need, create a higher plan (voucher plan and MAC tariff separately) and have the hotel test with a voucher on that plan.
<!-- evidence: FW-012, FW-180 -->

### "We upgraded the line and it is still slow"
First set the WAN bandwidth setting on the gateway to the new uplink — it must match the real line or the old figure keeps shaping everyone. Then check the tariff of the test user, the link rate of the test device, and ask for several speed tests with timestamps (wired behind the gateway if possible, then on Wi-Fi). Packet loss at specific times in the gateway logs is uplink degradation: give the ISP the timestamps and loss percentages — an ISP running eight pings at a quiet moment proves nothing about an intermittent fault, and other addresses of the same ISP working does not clear the affected line. Size the uplink against the tariffs: if the per-user tariff is a large share of the line, a handful of users saturate it. When all of this is clean, escalate to the HSIA team with the measurements attached.
<!-- evidence: FW-012, FW-039 -->

## 6. Addressing: DHCP, VLANs, configuration details

### DHCP pool exhaustion and switch-port checks
Phones that associate but never get an IP while infrastructure devices still receive addresses is a full DHCP pool: compare the pool size with the number of leases and widen the range (for example to /20). Widening changes the network mask for connected users, so agree a window and have reception verify on site right after. MAC randomisation makes phones take a fresh lease per visit, which drains pools faster than the room count suggests. A room whose network is visible but shows "no internet" while the access point looks healthy is usually the switch port: access-lists or the wrong VLAN — the AP name often carries a comment naming the switch and port. Configuration details a hotel asks for (DHCP pool size, lease time, DHCP server address, gateway, DNS) come from the HSIA team: request them and relay, never guess.
<!-- evidence: FW-171, FW-027, FW-126, FW-147 -->

## 7. Captive portal

### Portal page problems
iOS should open the landing page automatically after joining the network; when it does not, the guest opens any web page in a browser to be redirected, and persistent cases go to the HSIA team. A white screen after the SMS code (or after room-number login) on several devices is on the portal side: confirm it happens with more than one method and device, then escalate; watch Activity for new successful logins to know when it is over and ask the hotel to confirm. A page that is not shown at all: check that the device gets an address from the guest subnet and whether the network is currently running open (see the next entry). Text colours on the portal can be changed by support on request; the dropdown arrow that reveals the other login options (colour, size) is not configurable and goes to R&D as a feature request.
<!-- evidence: FW-079, FW-068, FW-122, FW-147, FW-240 -->

### Disabling authentication or an SSID
Running the guest network open without authentication is an exception: the HSIA team approves it, it is time-boxed, and the ticket stays open until authentication is switched back on and the hotel confirms. Partners ask for it when login is broken and guests are waiting; say what it costs (no per-user tariffs, no guest identification) and offer vouchers first. A request to disable authentication permanently is a security signal (E-010 in [Escalate or Answer](Escalate-or-Answer)). Disabling a named SSID or a whole guest network is HSIA-team work — forward it and set On Hold.
<!-- evidence: FW-027, FW-187, FW-203, FW-051 -->

## 8. Coverage and access-point symptoms

### One room, one floor: the contractor's access points
"No Wi-Fi in room N", "guests complain about Wi-Fi in one room", "four rooms on one floor keep dropping": the answer is the nearest access points, and rebooting them is the contractor's job — we confirm clients on the gateway afterwards. Where old HP or Ruckus units are being replaced by newer ones, recommend prioritising floors whose APs also serve the floors above and below. An AP in the room that broadcasts but gives "no internet" is a port/VLAN case (§6). For anything stubborn arrange a live test: a staff member with a phone inside the AP's coverage while the engineer watches the controller and the gateway and the staff member reports what the device shows. Regular disconnects every few minutes while wired clients are fine go to the HSIA team with the room list and the times.
<!-- evidence: FW-018, FW-179, FW-071, FW-027, FW-057 -->

## 9. Requests catalogue

### Who does what
| Request | Who does it | Notes |
|---|---|---|
| Activate SMS login | Support | needs SMS gateway credentials, originator and an SMS tariff |
| Disable the voucher option | Support | property keeps PMS + SMS |
| Extend bonus / in-house expiry time | Support | per-property setting; confirm the value set |
| Add portal rights (vouchers, device info) | Support | check current rights first |
| Create a higher tariff/plan | Support | voucher plan and MAC tariff are separate |
| Whitelist public IPs (theirs on our services, ours on their firewall) | responsible team / HSIA team | addresses exchanged separately, never in ticket text |
| Share network configuration details | HSIA team | DHCP pool, lease, DHCP server, gateway, DNS |
| Disable a network / SSID | HSIA team | On Hold until done |
| Public IP change, router replacement, config migration | HSIA team | HSIA service desk task |
| HSIA portal password reset | Support | check the registered e-mail address |


<!-- evidence: FW-172, FW-142, FW-202, FW-233, FW-051 -->

## 10. Triage rows

### T-WIFI-01 — "A guest cannot connect to the Wi-Fi", no details
**Symptom.** A partner or hotel writes that guests cannot connect to the internet; no login method, error text, room or device is given.
**First checks.** Which property; which login method the hotel uses (PMS, voucher, SMS, MAC, e-mail); what the guest sees (no network, no portal page, an error on login, connected but no internet); one room or everyone; a screenshot or photo of the portal.
**Typical cause.** Cannot be determined without the answers — most of these turn out to be a pre-check-in login, an expired voucher or a single access point.
**Owner.** Acme Support for intake; then per the answers.
**Fix or answer.** Reply the same day with the question list and the ways guests log in at that property; a missed chat gets an e-mail follow-up, never silence.
**Also asked as.** «гости не могут подключиться к Wi-Fi», «не работает интернет у гостей», "guest is unable to connect to the WiFi", "please check the Wi-Fi"
<!-- evidence: FW-026, FW-123 -->

### T-WIFI-02 — Room number + last name is rejected
**Symptom.** "Incorrect login information" for room + surname; often only today's arrivals are affected while earlier guests stay connected.
**First checks.** Guest checked in and in the CMS Guest list; attempt time versus PMS check-in time; exact surname as received; does the CMS show any checked-in guests at all; is the TV server reachable.
**Typical cause.** Login before the check-in reached us; surname spelled differently than the PMS sent it; PMS link stalled (interface stopped, VPN or server down, webhook deactivated, cloud delay); PMS API rejecting our address (403 NotWhitelisted).
**Owner.** Acme Support; link problems per [PMS Integration](PMS-Integration).
**Fix or answer.** Pre-check-in and spelling cases: explain and retry. Stalled link: restart the integration interface or request a resync; no server access: [Remote Access and Connectivity](Remote-Access-and-Connectivity). Vouchers bridge the gap.
**Also asked as.** «указана неверная информация для входа», «не работает авторизация по фамилии и номеру комнаты», "cannot log in with room number and last name", "PMS login is not working"
<!-- evidence: FW-187, FW-174, FW-193, FW-238 -->

### T-WIFI-03 — Voucher does not work, or vouchers are needed for an event
**Symptom.** A voucher code is refused, or the hotel asks us to "provide vouchers" for a group.
**First checks.** Expiry of the voucher in the Vouchers section; the plan it was issued on; whether the voucher option is enabled for the property; whether the partner's account has voucher rights.
**Typical cause.** Expired voucher; voucher option disabled at the property's own request; missing user right.
**Owner.** Acme Support; voucher-creation bugs go to the HSIA team.
**Fix or answer.** Generate a new voucher (the partner does this in Vouchers); for events, show them the section — we do not hand out codes. Guests with blocked phone numbers use vouchers instead of SMS.
**Also asked as.** «ваучер не работает», «нужны ваучеры для участников мероприятия», "voucher expired", "please provide Wi-Fi vouchers for our event"
<!-- evidence: FW-206, FW-211, FW-093, FW-172 -->

### T-WIFI-04 — SMS code never arrives
**Symptom.** Guests enter a phone number and no SMS arrives; often "it worked yesterday".
**First checks.** SMS tariff present in the portal; SMS gateway settings (endpoint, username, password, originator) match what the hotel supplied; send a test SMS to your own number from the portal; ask whether the hotel's SMS provider account is active.
**Typical cause.** SMS provider not accepting requests (account, balance, originator) — the most common; SMS tariff missing; wrong credentials after a provider change.
**Owner.** Acme Support for settings; the hotel and its SMS provider for delivery; HSIA team for a gateway-side check.
**Fix or answer.** Recreate the tariff if missing; confirm the settings; if a test SMS from the portal also fails, tell the hotel to open a case with the SMS provider and offer vouchers meanwhile.
**Also asked as.** «не приходит СМС с кодом», «не работает авторизация по СМС», "SMS code not received", "SMS authorization stopped working"
<!-- evidence: FW-172, FW-211 -->

### T-WIFI-05 — White screen after entering the code
**Symptom.** The guest enters the SMS code (or room details), taps Connect, and gets a blank white page; no internet.
**First checks.** Same on room-number login; on more than one phone; Activity tab — are other guests still authenticating; when it started.
**Typical cause.** Portal-side fault affecting every method; occasionally a single device's browser.
**Owner.** Acme Support, escalating to the HSIA team / R&D.
**Fix or answer.** Escalate with the answers; monitor Activity for new successful logins and ask the hotel to confirm once they appear. Offer a time-boxed open network only with HSIA-team approval.
**Also asked as.** «белый экран после ввода кода», «после нажатия Подключиться ничего не происходит», "white screen after SMS code", "captive portal shows a blank page"
<!-- evidence: FW-068 -->

### T-WIFI-06 — Portal page does not appear, or the network is open without login
**Symptom.** Guests join the network and no login page opens (all or some devices, notably iOS); or the hotel reports "the network is open but there is no internet".
**First checks.** Does the device get an IP from the guest subnet; does opening any web page redirect to the portal; is authentication currently disabled as an exception; which devices are affected.
**Typical cause.** The device did not trigger captive-portal detection; wrong subnet/VLAN on the AP port; authentication switched off earlier and not yet restored.
**Owner.** Acme Support; HSIA team when authentication has to be re-enabled or the redirect fails on the gateway.
**Fix or answer.** Guests: open a browser page manually. Network side: check the address the device received. If the property runs open by exception, get the re-enable date from the HSIA team and tell the hotel.
**Also asked as.** «не появляется страница авторизации», «сеть открытая, но интернета нет», "captive portal page does not open on iPhone", "login page not shown"
<!-- evidence: FW-147, FW-122, FW-079, FW-203 -->

### T-WIFI-07 — Welcome Back did not re-authenticate a device
**Symptom.** A returning guest's phone had to log in again although Welcome Back is enabled.
**First checks.** Access history for the device MAC — one record or several; whether the phone uses a private/randomised address for this network.
**Typical cause.** MAC randomisation on the phone — a new address has no history.
**Owner.** Acme Support (answer only); nothing to fix.
**Fix or answer.** Explain that re-authentication is by MAC and a randomised MAC is a new device; close as Won't Do (Resolved). Guests who want the convenience can switch off the private address for the hotel network.
**Also asked as.** «Welcome Back не сработал», «гостя не пустило автоматически», "auto re-login did not work", "guest had to log in again"
<!-- evidence: FW-094, FW-083, FW-171 -->

### T-WIFI-08 — Still slow after the ISP line was upgraded
**Symptom.** The hotel bought more bandwidth; speed tests on guest Wi-Fi did not improve, upload and download fluctuate.
**First checks.** WAN bandwidth setting on the gateway versus the new line; tariff of the test user; Wi-Fi link rate of the test device; speed tests with timestamps, wired and wireless; gateway logs for loss.
**Typical cause.** WAN setting still at the old figure; tariff cap; link rate; ISP degradation; unrealistic per-guest expectations.
**Owner.** Acme Support; HSIA team when measurements contradict the settings; ISP for loss on the line.
**Fix or answer.** Update the WAN setting, explain the caps (about 20 Mbps per guest is enough; upload and download share the link), suggest a bigger line only when total demand needs it. Escalate with results if it stays slow.
**Also asked as.** «после расширения канала интернет всё равно медленный», «низкая скорость Wi-Fi», "Wi-Fi still slow after bandwidth upgrade", "speeds fluctuate"
<!-- evidence: FW-012, FW-039 -->

### T-WIFI-09 — Higher speed needed for a VIP or on a specific port
**Symptom.** A partner asks to "open" more bandwidth on an HSIA switch port for a guest or an event; the switch integrator says their side is fully open.
**First checks.** Which tariff the guest would authenticate with; which plans exist in the portal; the link rate at the location.
**Typical cause.** The per-user tariff caps the speed, not the port; no higher plan exists yet.
**Owner.** Acme Support.
**Fix or answer.** Create the higher plan (voucher plan and, if asked, a MAC tariff), let the hotel issue a test voucher and measure; explain the link-rate limit. Join a call when several parties keep bouncing the request — the bouncing itself is a commercial-risk signal (E-007).
**Also asked as.** «увеличить скорость для VIP-гостя», «снять ограничение на порту HSIA», "increase bandwidth for a VIP guest", "no higher speed option in the portal"
<!-- evidence: FW-180 -->

### T-WIFI-10 — Main ISP line drops intermittently
**Symptom.** The main provider's link comes and goes; the gateway falls back to the backup line; the ISP says "our pings are clean".
**First checks.** Gateway logs for link loss with timestamps and loss percentages; the public addresses in use on the router; whether the installation was fully commissioned.
**Typical cause.** Degradation on the provider's line at specific times; occasionally a local cabling or port issue on the hotel side.
**Owner.** ISP for the line (the hotel raises it); HSIA team for the logs.
**Fix or answer.** Send the timestamps and loss figures for the hotel to hand to the ISP; explain that a short ping test at a quiet moment does not disprove intermittent loss. Recommend a larger uplink if it is small relative to the tariffs.
**Also asked as.** «периодические обрывы канала основного провайдера», «работаем через резервный канал», "main ISP line keeps dropping", "provider says everything is fine"
<!-- evidence: FW-039, FW-220 -->

### T-WIFI-11 — Devices do not get an IP address
**Symptom.** Phones connect to the SSID but never receive an address; infrastructure devices are still visible in the controller.
**First checks.** DHCP pool size versus active leases on the gateway; time-of-day pattern (evenings); recent growth in device count.
**Typical cause.** Exhausted DHCP pool, aggravated by MAC randomisation.
**Owner.** HSIA team (pool change); hotel IT if DHCP is not served by us.
**Fix or answer.** Widen the pool (for example to /20) in an agreed window with someone on site to verify; warn that connected users are affected during the change.
**Also asked as.** «устройства не получают IP-адреса», «закончились адреса в DHCP», "devices do not get an IP address", "DHCP pool exhausted"
<!-- evidence: FW-171, FW-147 -->

### T-WIFI-12 — Gateway offline, MikroTik unreachable
**Symptom.** Monitoring warnings, traffic down in the portal, no internet in a building or tower; the router has power but does not answer. All guest Wi-Fi down is a whole-property outage (E-006).
**First checks.** Is it a firmware-update switchover (guests still authenticate, WAN normal) or a hang; can anyone on site power-cycle it; is the WireGuard tunnel up; are TVs behind it also affected.
**Typical cause.** Hung router; planned failover after a firmware update; less often an uplink fault.
**Owner.** HSIA team; the hotel for the power cycle.
**Fix or answer.** Power cycle on site, then confirm in the portal. Root cause needs a supout file taken while it misbehaves — without it, say the logs are inconclusive and list the preventive measures. Power-cycle LG TVs that did not return after the switch.
**Also asked as.** «MikroTik недоступен», «шлюз не отвечает», "gateway offline", "MikroTik has power but is not reachable"
<!-- evidence: FW-166, FW-095, FW-108, FW-130, FW-112 -->

### T-WIFI-13 — Wi-Fi bad in one room or a few rooms
**Symptom.** Guests in one room (or several rooms on one floor) have weak or no Wi-Fi while the rest of the hotel is fine.
**First checks.** Nearest access points and their clients; the switch port of the AP (VLAN, access-lists); whether any AP is missing from the controller.
**Typical cause.** An AP that needs a reboot; a misconfigured port; ageing APs on that floor.
**Owner.** Hotel IT / network contractor for APs and ports; Acme Support confirms on the gateway.
**Fix or answer.** Have the contractor reboot the nearest APs and confirm clients reconnect; suggest prioritising the AP replacement on that floor; arrange a live test with staff if it persists.
**Also asked as.** «в номере не работает Wi-Fi», «просьба перезагрузить оборудование», "no Wi-Fi in one room", "please reboot the access point near room N"
<!-- evidence: FW-018, FW-179, FW-071, FW-027 -->

### T-WIFI-14 — Wi-Fi drops every few minutes
**Symptom.** Internet works for 5–10 minutes after connecting, then "no internet" until the guest reconnects; wired connections are fine; or sessions end roughly every 10 minutes with a given login method.
**First checks.** Room numbers and device MACs; the login method; session records in Sessions; the tariff and expiry settings; whether it is one AP area or everywhere.
**Typical cause.** Not determinable at L1 — needs the HSIA team (session and tariff settings, gateway) with the examples; some cases stop by themselves.
**Owner.** HSIA team; hotel IT if limited to one AP.
**Fix or answer.** Collect examples and escalate to the HSIA team; notification-only tickets from a service desk about the same issue are linked and resolved.
**Also asked as.** «Wi-Fi отключается каждые 5–10 минут», «разрыв сессии каждые 10 минут», "Wi-Fi disconnects every few minutes", "session drops every 10 minutes"
<!-- evidence: FW-057, FW-098, FW-091, FW-118 -->

### T-WIFI-15 — Access codes vanished from the admin panel, portal cannot reach the gateway
**Symptom.** The Wi-Fi access codes no longer show in the admin panel, or portal functions that talk to the gateway fail.
**First checks.** Can the portal reach the MikroTik over the hotel's external address on the management ports (Winbox, API); is the WireGuard tunnel up; did the hotel change its firewall or public address.
**Typical cause.** A hotel firewall or ISP change blocked our source addresses on the management ports.
**Owner.** Acme Support / HSIA team to switch the path; hotel IT to restore direct access.
**Fix or answer.** Switch the portal-to-gateway interaction to VPN to restore service, then give the hotel the ports and (separately) our source addresses to whitelist. See [Remote Access and Connectivity](Remote-Access-and-Connectivity).
**Also asked as.** «пропали коды доступа в админ-панели», «нет соединения с роутером по внешнему адресу», "access codes disappeared from the admin panel", "portal lost connection to the MikroTik"
<!-- evidence: FW-233, FW-007 -->

### T-WIFI-16 — HSIA portal account: password reset or missing rights
**Symptom.** A user cannot reset the portal password (no e-mail arrives) or cannot see voucher creation / device details.
**First checks.** The e-mail address the account is registered to; spam folder; the rights currently assigned; a screenshot of what they see.
**Typical cause.** Account registered to an old corporate mailbox; the right already exists and the user is looking in the wrong place.
**Owner.** Acme Support.
**Fix or answer.** Update the address and resend the reset link; grant the right if missing, otherwise walk them through the section. Never send passwords by e-mail.
**Also asked as.** «не приходит письмо для сброса пароля HSIA», «добавьте права в админку HSIA», "cannot reset HSIA portal password", "add rights to create vouchers"
<!-- evidence: FW-127, FW-128 -->
