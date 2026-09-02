<!-- meta
id: glossary-and-phrasebook
type: reference
audience: support
tags: [glossary, phrasebook, terms, abbreviations, russian, english, vocabulary, products, hsia, pms, bsp, hotsign, admin panel, statuses]
-->

# Glossary and Phrasebook

**Read this when:** a ticket uses a word you do not recognise, a Russian phrase needs mapping to our English term and the right page, or you need the canonical name of a product, team or abbreviation before you write.

---

## 1. Products and components

Names are canonical — use them exactly as written here in tickets and wiki pages.

### Acme TV and the TV server
- **Acme TV** — the interactive TV application (IPTV middleware) on hotel TVs and set-top boxes; partners say "TV app", "IPTV", "middleware", "interactive menu". Read [Acme TV](Acme-TV).
- **TV server** — the on-prem Ubuntu server or VM (or a cloud deployment) behind Acme TV: nginx front end, chanadmin, the PMS interface (pmsdaemon / fias_connecter), the streamer with its **streameradmin** web UI, an OpenVPN client, a Zabbix agent; often the DHCP server for the TV network; version file acme/version.json. Read [Updates, Maintenance and Change Control](Updates-Maintenance-and-Change-Control).
- **Set-top box (STB)** — TVIP or LG boxes running Acme TV on non-hospitality screens; Netflix is not available on TVIP. Read [Acme TV](Acme-TV).
- **Acme cloud** — admin panel/CMS, queues and notifications hosted per region (EU, NA, RU) at the cloud provider. Read [Admin Panel and CMS](Admin-Panel-and-CMS).
<!-- evidence: FW-158, FW-014, FW-230 -->

### Casting and channels
- **AcmeStream** — the casting service: Chromecast, and Apple TV / AirPlay through an Apple service on the TV server; partners say "Air Stream", "casting", "AppleTV option". Read [Casting, Chromecast and AirPlay](Casting-Chromecast-and-AirPlay).
- **Session controller** — physical unit of legacy casting installs; the current AcmeStream version removes them (Chromecasts get static IPs, the MikroTik takes part).
- **Encoder (video)** — takes the Chromecasts' HDMI outputs and multicasts them to the TVs; not the card encoder used for door locks.
- **Channel provider / headend** — the source of the multicast or HLS channel streams; stream quality and missing channels belong to it or to the hotel network. Read [TV Channels and Video Streaming](TV-Channels-and-Video-Streaming).
<!-- evidence: FW-199, FW-017, FW-061 -->

### Guest-facing apps and signage
- **Acme Guest App** — the guest web app ("WebApp": a public per-hotel subdomain from the internet, the internal server IP inside the hotel network) and the native mobile app (App Store / Google Play; region Europe/Asia chosen at login). Read [Guest App](Guest-App).
- **Acme Staff** — the staff mobile app for orders, service requests and notifications; the Europe server is selected at login. Read [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App).
- **Acme HotSign** — digital signage with its own CMS (playlists, schedules, Push Updates) and players — the Raspberry Pi image Hotsign-com-6.8.img for RPi 4 and other player types; current build 5.37.12. Read [HotSign Digital Signage](HotSign-Digital-Signage).
<!-- evidence: FW-148, FW-085, FW-149 -->

### Guest Wi-Fi
- **Acme HSIA** — guest Wi-Fi: MikroTik gateway(s) (main + backup, automatic failover) plus the **HSIA portal** (admin: Activity, Cluster, Sessions, Monitoring tabs; Vouchers; tariffs/plans; SMS settings; per-property Wi-Fi settings) and the **captive portal** guests see. Access points, switches and the internet uplink belong to the hotel or its contractor (TP-Link, Ruckus, HP, Zyxel appear). Read [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA).
- **HSIA team** — our network engineers (gateways, portal backend, DHCP/VLAN advice); they run their own service desk, which auto-resolves a request after 2 days without a reply (re-open by commenting). Read [Support Operations](Support-Operations).
<!-- evidence: FW-171, FW-018, FW-083 -->

### Admin panel and CMS
- **Old admin panel** ("legacy CMS", «старая админка») and **new admin panel** ("admin v2", «новая админка», still beta for some partners) coexist during the migration; each has regional URLs (EU, NA, RU) plus a local in-property link. Login option 1 = login/password, option 2 = SSO. Read [Admin Panel and CMS](Admin-Panel-and-CMS).
- **Menu Builder** — where sections of the TV and app menu are created; content outside a section never shows. **Display Groups** — device grouping for content targeting. **Guest list** — the checked-in guests as received from the PMS.
- **Zoho Desk** — our ticketing; partner service desks send acknowledgements and status mails into it as tickets. Read [Support Operations](Support-Operations).
<!-- evidence: FW-182, FW-076, FW-169 -->

### Rooms: tablets, automation, locks
- **BSP / RoomConnect** — the in-room tablet and its Android app (APK versions such as v900, 2.1.960); "BSP" names the device and the app. **MAS** — room-automation module on a Raspberry Pi (AC, lights, default language). **RCU** — room control unit (e.g. type Light Dimmer). **GRMS** — a third-party guest room management system reached through Acme TV "Room Control". Read [In-Room Tablets and Room Control](In-Room-Tablets-and-Room-Control).
- **Access control** — OS Access (osaccess) cloud access control with portal and app; **Upkey** app for lock audits and device settings; **SmartPass** card-encoding software (needs a registration code); MIFARE Classic 1K guest cards, 4K initialisation/audit cards; card encoder ACR1281U-C8; mobile key through the key provider's SEOS cloud. Supported by Acme Support in Russia only. Read [Door Locks and Mobile Keys](Door-Locks-and-Mobile-Keys).
<!-- evidence: FW-054, FW-058, FW-055 -->

### Third parties, customers and teams
- **PMS vendors** — Oracle Opera (on-prem via FIAS, cloud via OHIP), Opera Cloud, Protel Air, Shiji, 1C (Russia). **POS vendors.** **Task trackers** — Flexkeeping, HotSOS, Treema. **Locks** — the SEOS mobile-key provider, OS Access, Omnitec. TV makers LG, Samsung, Philips, Loewe. Cloud provider, Mailgun (mail delivery), SMS gateway provider, ISP. Read [PMS Integration](PMS-Integration).
- **Customers** — a **property** or hotel is one site; a **partner** (integrator, reseller, management company) opens tickets for several properties — always confirm which; **hotel IT** / network contractor owns switches, APs, uplink and firewall; the **on-site contact** tests for us; **guests** and **staff** are the end users.
- **Teams** — Acme Support (L1/L2, "we"), HSIA team, R&D (development team, "RnD"), Product manager, Deployment team (installations, migrations, PMS cut-overs, large updates), Content managers, Project manager (PM — installation stage, contracts, hand-over), Account manager (AM — licences, renewals, commercial), Business Development. Read [Escalate or Answer](Escalate-or-Answer).
<!-- evidence: FW-031, FW-193, FW-225, FW-198 -->

## 2. Abbreviations

### Network, devices and streaming
| Abbreviation | Meaning in our tickets |
|---|---|
| HSIA | High-Speed Internet Access — the guest Wi-Fi product and the team behind it |
| DHCP / VLAN / MAC | address leasing (pool exhaustion = no IP); network segments (TV VLAN, guest VLAN); device hardware address (whitelists, Welcome Back, randomisation) |
| WOL | Wake-on-LAN — the fallback path to power a TV on |
| VPN | OpenVPN client on the TV server, WireGuard from gateways — our remote access path |
| ISP / VM | the hotel's internet provider; the hotel's virtual machine hosting our server |
| UDP / HLS | multicast stream addresses; HTTP live streaming (needs a Acme version that supports it) |
| STB / APK / RPi | set-top box; Android package (BSP app versions); Raspberry Pi (HotSign players, MAS) |
| BSP / RCU / MAS / GRMS | in-room tablet; room control unit; room automation module; guest room management system |
| CC / CI | Chromecast (CC2 = the second Chromecast in a rotation); check-in (the tablet's CI screen) |
| QR / SSO | QR-code login and the QR payment option; single sign-on (admin panel login option 2) |
<!-- evidence: FW-171, FW-060, FW-066, FW-023, FW-052 -->

### Hospitality, integrations and process
| Abbreviation | Meaning in our tickets |
|---|---|
| PMS / POS / CMS | property management system; point of sale; our content management system (the admin panel) |
| FIAS / OHIP | Opera on-prem interface (port 5090); Opera Hospitality Integration Platform (cloud) |
| IRD / F&B | in-room dining; food and beverage |
| SKU | item code synchronised from the POS — create items in the POS first |
| R&D / RnD / PM / AM / GM | development team; project manager; account manager; general manager |
| SLA / ETA | service targets (P1–P4 on Escalate-or-Answer); estimated time — never promised for R&D items |
| CRM | our customer record of properties (installation stage vs handed over) |
| E- / Q- / X- / U- / K- / T- | wiki identifier families: escalation triggers, intake gates, confusable symptoms, unsupported requests, known issues, product triage rows |
<!-- evidence: FW-227, FW-156, FW-198, FW-249 -->

## 3. Support vocabulary

### TV, content and update words
**Service code** — digits typed on the remote from the main menu: 1800 diagnostics (Network, Device, Authorization), 1169 log (1173 on some builds), 1105 reset registration, 100 force content refresh. **Registration** — the TV's room number; a room appears in the panel when a TV authorises. **Licence** — TV licences, Cast licences and tablets are counted separately; "License Limit Exceeded" appears when cloning. **Clone file** — the TV configuration image used to set up sets in bulk. **Test folder / main folder** — the two builds on the TV server during an update. **Legacy panel** — the old admin panel; **legacy port/format** — the older TV app format on an alternate port. **Publish** — the CMS action that pushes content; propagation up to ~20 minutes. **Device types** — TV / WEB / GUESTAPP flags on each content item. **Region** — EU, NA or RU hosting of the property's panel and cloud (the app's Europe/Asia server is a separate choice). **Virtual Standby** — LG hotel-mode setting for fast boot. **Connected devices** — admin panel view with model, MAC and firmware.
<!-- evidence: FW-168, FW-223, FW-011, FW-165, FW-049 -->

### Casting and channel words
**Multicast address** — the UDP address a channel or Chromecast stream is served on; test it in VLC from a laptop in the TV VLAN. **Streamer** — the TV server service that serves the welcome and info channels; restart it first. **Encoder** — the HDMI-to-multicast box for casting. **Rotation** — the pool of Chromecasts offered to guests; a faulty one can be excluded as a workaround. **Chromecast identifier** — changes between sessions; expected. **Info channel / welcome video** — served by the streamer; several videos can be combined into one looping video channel. **Session controllers** — legacy casting hardware, removed by the current AcmeStream. **Stream service upgrade** — about 1.5 hours, needs static IPs for the Chromecasts.
<!-- evidence: FW-052, FW-164, FW-061, FW-199 -->

### Wi-Fi words
**Voucher** — a code generated in the HSIA portal's Vouchers section; vouchers expire. **Tariff / plan** — the per-user speed cap; higher speeds need a plan, and the Wi-Fi link rate caps too. **Bonus time / in-house expiry** — how long a login lasts; a per-property setting. **Predictive login** — tolerates a one-character typo in the surname (shown as "User Login - predictive" on the Activity tab). **Welcome Back** — automatic re-login by MAC; fails when the phone randomises its MAC. **MAC whitelist** — a login method for known devices. **Captive portal / landing page** — the page guests see; "white screen" reports usually mean it. **Gateway** — the MikroTik we control; **access point** — the hotel's. **Open network exception** — a temporary network without authentication, approved by the HSIA team and time-boxed.
<!-- evidence: FW-206, FW-142, FW-083, FW-094, FW-172 -->

### PMS and order words
**Check-in / check-out** — PMS events that power the TV on, greet the guest by surname, enable Wi-Fi login and reset the TV afterwards; **auto-check-out** N hours after the planned departure is a per-property option. **Room status** — the housekeeping status sent from the TV to the PMS; **Inspect** — the inspection module on the TV. **Posting / folio** — minibar and order charges to the guest bill; the PMS flag Posting deny blocks room-account payment. **Shop Orders** vs **Service Requests**; statuses New → Confirmed → Completed, or Cancelled; **overdue reminder** — the e-mail repeated until Completed. **Callback domain** — the Russian API domain for hotels in Russia, the international domain elsewhere. **Service charge** — a percentage set in the CMS and published. **Add-ons / options** — priced extras on an item. **Working hours** — set per menu or section; outside them the order goes to the nearest slot.
<!-- evidence: FW-157, FW-192, FW-196, FW-245, FW-036 -->

### Ticket status and process words
**Open** — new, not yet worked. **Pending** — waiting for the customer or partner. **On Hold** — waiting for an internal team or a third party. **Push RND/Product/etc** — handed to R&D or product as a bug or feature request; no ETA is given. **Resolved** — fix delivered, awaiting confirmation; closes automatically if nobody replies. **Closed** — confirmed, or no action needed. **Reply vs comment** — answer through Reply so Zoho threads it; a comment does not reach the customer. **Maintenance window** — an agreed time in the hotel's time zone with a person on site. **Change freeze** — a period a hotel asks us to make no changes; relayed to engineering and the PMs. **Severity** — P1 whole-property or safety, P2 many rooms or one function, P3 single room or cosmetic, P4 questions and feature requests; impact sets it, not the reporter's wording.
<!-- evidence: FW-036, FW-174, FW-105, FW-016 -->

## 4. RU/EN phrasebook

Reporters write in Russian and in English variants; the search index only sees English, so use the middle column's words in titles, tags and replies.

### TV basics
| Reporter writes | Our term (search words) | Page |
|---|---|---|
| «чёрный экран», «ТВ не видит сервер», "black screen on TV" | black screen at TV start-up, no menu, TV cannot reach the TV server | [Acme TV](Acme-TV) |
| «приставка» | set-top box, STB (TVIP box, LG box) | [Acme TV](Acme-TV) |
| «пульт» | remote control (not RCU) | [Acme TV](Acme-TV) |
| «прошивка», "update the TVs" | TV firmware update (distinct from the TV app version) | [Updates, Maintenance and Change Control](Updates-Maintenance-and-Change-Control) |
| «сервисный код», «сервисное меню» | service code 1800 / 1169 / 1105 / 100; hotel-mode service menu | [Acme TV](Acme-TV) |
| «перезагрузить по питанию» | power cycle | [Acme TV](Acme-TV) |
| «долгая загрузка приложения», «ТВ долго включается» | slow app start, slow boot, Virtual Standby | [Acme TV](Acme-TV) |
| «перенос ТВ в другой номер», «сброс оболочки» | move a TV to another room, reset registration (code 1105) | [Acme TV](Acme-TV) |
| «лицензии», «лимит лицензий» | TV licences, Cast licences, License Limit Exceeded | [Licensing and Commercial Requests](Licensing-and-Commercial-Requests) |
<!-- evidence: FW-120, FW-049, FW-223, FW-168 -->

### Content and publishing
| Reporter writes | Our term (search words) | Page |
|---|---|---|
| «контент не обновляется», "changes not visible on TV" | content not updating on TV, publish, code 100, cache | [Admin Panel and CMS](Admin-Panel-and-CMS) |
| «обновить папку», «тестовая папка» | update the main folder; test folder method | [Updates, Maintenance and Change Control](Updates-Maintenance-and-Change-Control) |
| «опубликовать», «личный кабинет» | Publish (propagation ~20 minutes); admin panel | [Admin Panel and CMS](Admin-Panel-and-CMS) |
| «раздел меню», «пункт меню» | Menu Builder section | [Admin Panel and CMS](Admin-Panel-and-CMS) |
| «типы устройств», "TV / WEB / GUESTAPP" | content device types | [Admin Panel and CMS](Admin-Panel-and-CMS) |
| «приветственный ролик», «приветственный экран» | welcome video, welcome page (sound needs a video file) | [TV Channels and Video Streaming](TV-Channels-and-Video-Streaming) |
| «спецпредложения», «мероприятие» | Special offers section, event content | [Admin Panel and CMS](Admin-Panel-and-CMS) |
<!-- evidence: FW-182, FW-037, FW-214, FW-162 -->

### Channels, streaming and casting
| Reporter writes | Our term (search words) | Page |
|---|---|---|
| «каналы лагают», «подтормаживают», "channels freeze" | channel lag, buffering, high-bitrate stream, old TV | [TV Channels and Video Streaming](TV-Channels-and-Video-Streaming) |
| «мультикаст-адрес», «адреса вещания» | multicast address, UDP stream, channel list mapping | [TV Channels and Video Streaming](TV-Channels-and-Video-Streaming) |
| «головная станция» | headend, channel provider | [TV Channels and Video Streaming](TV-Channels-and-Video-Streaming) |
| «промо-ролик», «зациклить ролик», «инфоканал» | promo video, looping video channel, info channel | [TV Channels and Video Streaming](TV-Channels-and-Video-Streaming) |
| «кастинг», «трансляция с телефона», "Air Stream" | casting, AcmeStream, Chromecast | [Casting, Chromecast and AirPlay](Casting-Chromecast-and-AirPlay) |
| «все устройства заняты» | "All devices busy", service unavailable, restart AcmeStream | [Casting, Chromecast and AirPlay](Casting-Chromecast-and-AirPlay) |
| «звук есть, картинки нет» | audio but no picture, no multicast from Chromecast, encoder HDMI | [Casting, Chromecast and AirPlay](Casting-Chromecast-and-AirPlay) |
| «AppleTV не работает», «Bluetooth-наушники» | Apple TV option (Apple service); Bluetooth pairing (TV feature) | [Casting, Chromecast and AirPlay](Casting-Chromecast-and-AirPlay) |
<!-- evidence: FW-061, FW-014, FW-052, FW-017 -->

### Guest Wi-Fi login
| Reporter writes | Our term (search words) | Page |
|---|---|---|
| «не работает авторизация гостей», "guests cannot authenticate" | guest Wi-Fi login fails, captive portal login | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
| «вход по фамилии и номеру комнаты» | PMS login, room number + last name, surname spelling | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
| «ваучер», «воучер», «коды доступа» | voucher, access code, Vouchers section, expired voucher | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
| «SMS-авторизация», «по номеру брони» | SMS login (gateway credentials, SMS tariff); reservation number login | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
| «белый экран при авторизации», «страница авторизации не открывается», «лендинг» | white screen on the captive portal, landing page not opening | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
| «время действия доступа», «доступ истекает» | expiry time, bonus time, in-house expiry | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
| «отключить авторизацию временно» | temporary open network exception (HSIA team approval) | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
<!-- evidence: FW-027, FW-206, FW-172, FW-142 -->

### Wi-Fi network and remote access
| Reporter writes | Our term (search words) | Page |
|---|---|---|
| «точка доступа» | access point (the hotel's equipment) | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
| «шлюз», «роутер MikroTik», "gateway offline" | MikroTik gateway, failover, gateway offline | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
| «полоса», «скорость», «тариф» | bandwidth, speed cap, tariff plan, WAN setting | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
| «устройства не получают IP» | no IP address, DHCP pool exhausted | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
| «Wi-Fi отваливается», «обрывы» | Wi-Fi disconnects, ISP link drops, session drop | [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA) |
| «белый IP», «публичный адрес» | public IP address | [Remote Access and Connectivity](Remote-Access-and-Connectivity) |
| «проброс порта» | port forwarding to the server | [Remote Access and Connectivity](Remote-Access-and-Connectivity) |
| «нет доступа по VPN», «VPN не поднимается», «нет связи с сервером» | VPN tunnel down, OpenVPN blocked, WireGuard, server unreachable | [Remote Access and Connectivity](Remote-Access-and-Connectivity) |
| «белый список», "whitelist our IPs", «AnyDesk» | whitelisting platform IP ranges; AnyDesk remote session | [Remote Access and Connectivity](Remote-Access-and-Connectivity) |
<!-- evidence: FW-171, FW-031, FW-250, FW-018 -->

### PMS, check-in and guest data
| Reporter writes | Our term (search words) | Page |
|---|---|---|
| «заселение», «выселение» | check-in, check-out (PMS events) | [PMS Integration](PMS-Integration) |
| «синхронизация с PMS», «нет синхронизации» | PMS sync, PMS integration down, database resync | [PMS Integration](PMS-Integration) |
| «интерфейс не стартует», "interface disconnected" | PMS interface down, FIAS / OHIP interface, restart the interface | [PMS Integration](PMS-Integration) |
| «на ТВ нет фамилии гостя», «показывает Guest» | guest name missing on TV, Dear Guest, licences, PMS | [Acme TV](Acme-TV) |
| «статус номера», «инспекция номера» | room status (housekeeping status to PMS); Inspect module | [PMS Integration](PMS-Integration) |
| «минибар не проводится», «счёт гостя», «фолио» | minibar posting, folio, postings to the guest bill | [PMS Integration](PMS-Integration) |
| «вебхук», «callback URL», «адрес API» | PMS webhook, callback domain (Russian vs international API domain) | [PMS Integration](PMS-Integration) |
| «остался предыдущий гость», «не выселили» | previous guest data survives check-out (E-002), missing check-out | [Escalate or Answer](Escalate-or-Answer) |
| «автовыселение» | auto-check-out N hours after the planned departure | [Acme TV](Acme-TV) |
<!-- evidence: FW-205, FW-176, FW-021, FW-157, FW-196 -->

### Orders
| Reporter writes | Our term (search words) | Page |
|---|---|---|
| «заказ», «сервис-запрос», «заявка» | Shop Order vs Service Request | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «просроченный заказ», «уведомление о задержке» | overdue order reminder e-mail | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «заказ висит в New», «принять заказ», «выполнено» | order status New, Confirmed, Completed, Cancelled | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «сервисный сбор» | service charge percentage | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «допы», «добавки», «опции» | add-ons, options, toppings, order total | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «часы работы меню», «ночное меню» | working hours per menu section, nearest slot | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «способ оплаты», «онлайн-оплата» | payment method, online payments, on-arrival payments, QR payment | [Guest App](Guest-App) |
<!-- evidence: FW-196, FW-245, FW-036, FW-140 -->

### Staff, notifications and integrations
| Reporter writes | Our term (search words) | Page |
|---|---|---|
| «заявка на отмену уборки» | housekeeping cancellation request | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «не приходят письма о заказах», «нет уведомлений» | notification e-mails not arriving, Mailgun, spam, user services | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «уведомления без звука» | notifications arrive silently, browser sound settings | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «приложение для персонала», «выкидывает из приложения» | Staff app, random logout, Europe server | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «таск-трекер», "HotSOS / Flexkeeping / Treema" | task tracker integration, Complete status, no priority entity | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «POS», «касса», «код товара» | POS integration, SKU sync, cURL timeout | [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App) |
| «сообщения гостей», «мессенджер» | guest messages, one-way messaging | [Guest App](Guest-App) |
<!-- evidence: FW-047, FW-237, FW-085, FW-227 -->

### Admin panel, accounts and access
| Reporter writes | Our term (search words) | Page |
|---|---|---|
| «админка», «старая админка», «новая админка» | old admin panel (legacy CMS), new admin panel (admin v2) | [Admin Panel and CMS](Admin-Panel-and-CMS) |
| «не приходит письмо для сброса пароля» | password reset e-mail, link valid 60 minutes, spam | [Admin Panel and CMS](Admin-Panel-and-CMS) |
| «регион», «Европа / Азия», "EU / NA / RU link" | region: admin panel EU / NA / RU; app server Europe / Asia | [Admin Panel and CMS](Admin-Panel-and-CMS) |
| «вход через SSO», «первый / второй вариант входа» | login option 1 (password) / option 2 (SSO) | [Admin Panel and CMS](Admin-Panel-and-CMS) |
| «cookies отключены», «белый экран при входе» | cookies disabled, admin panel white screen | [Admin Panel and CMS](Admin-Panel-and-CMS) |
| «завести учётку», «права», «роль» | user account, Administrator role, staff list, property access | [Admin Panel and CMS](Admin-Panel-and-CMS) |
| «шаблоны рассылок», «языки интерфейса» | e-mail mailing templates; interface languages per property | [Admin Panel and CMS](Admin-Panel-and-CMS) |
| «сбой облачной инфраструктуры» | cloud infrastructure incident | [Known Issues and Release Notes](Known-Issues-and-Release-Notes) |
<!-- evidence: FW-022, FW-076, FW-169, FW-029, FW-041 -->

### Tablets, room control, locks and signage
| Reporter writes | Our term (search words) | Page |
|---|---|---|
| «планшет», "BSP", "RoomConnect" | in-room tablet (BSP / RoomConnect app, APK) | [In-Room Tablets and Room Control](In-Room-Tablets-and-Room-Control) |
| «попап заселения» | check-in popup, marketing notification, delivered flag | [In-Room Tablets and Room Control](In-Room-Tablets-and-Room-Control) |
| «управление ТВ с планшета» | BSP TV control, remote commands | [In-Room Tablets and Room Control](In-Room-Tablets-and-Room-Control) |
| «кондиционер», «свет», "MAS", "RCU", "Room Control" | room automation (MAS), room control unit, dimmer, GRMS | [In-Room Tablets and Room Control](In-Room-Tablets-and-Room-Control) |
| «ключ», «карта», «замок» | key card, lock, access control | [Door Locks and Mobile Keys](Door-Locks-and-Mobile-Keys) |
| «размагничиваются карты» | cards stop working (MIFARE chip, not magnetism; lock clock sync, audit) | [Door Locks and Mobile Keys](Door-Locks-and-Mobile-Keys) |
| «энкодер» (карт), «код регистрации» | card encoder ACR1281U-C8 (not the video encoder); SmartPass registration code | [Door Locks and Mobile Keys](Door-Locks-and-Mobile-Keys) |
| «мобильный ключ» | mobile key, SEOS cloud credential, key provider | [Door Locks and Mobile Keys](Door-Locks-and-Mobile-Keys) |
| «инфопанель», «вывеска», «плеер Raspberry» | HotSign player, playlist, Push Updates, RPi image | [HotSign Digital Signage](HotSign-Digital-Signage) |
<!-- evidence: FW-023, FW-188, FW-058, FW-055, FW-170 -->
