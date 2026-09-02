<!-- meta
id: door-locks-and-mobile-keys
type: product
audience: support
tags: [door locks, mobile key, access control, os access, osaccess, seos, mifare, key cards, encoder, upkey, smartpass, areas, omnitec, elevator]
-->

# Door Locks and Mobile Keys

**Read this when:** a ticket mentions key cards, encoders, the access-control portal or mobile app, a mobile key that does not open a door, an area or common-zone setting, or a SmartPass registration code.

---

## 1. Scope and geography

### What we support, and where

Acme Support supports the **OS Access** ("osaccess") cloud access-control system — its web portal and mobile app, the **Upkey** app for lock audits and device settings, the **SmartPass** card-encoding software, and the cards and encoders around them — **in Russia only**. For a property outside Russia we do not provide lock support and we do not keep a list of regional lock partners: point the reporter to the manufacturer's official documentation and to whoever installed the locks, and say so in the first reply so nobody waits on us. The mobile key is a different thing again: the credential is issued by the key provider's **SEOS** cloud service, and errors there belong to the key provider, in every region.
<!-- evidence: FW-219, FW-005 -->

### Severity

A guest who cannot enter a room — card refused, mobile key failing — is E-001 in [Escalate or Answer](Escalate-or-Answer): P1, acknowledge fast, keep working until the guest is in. Staff who cannot write any cards during arrivals (a vendor outage) is a whole-property problem: treat it as P1 and give the workaround from section 5 in the first reply. Configuration questions (areas, deleting a device, renaming locks) are P4 — answer them, but they never pre-empt a locked-out guest. Reporter wording does not set severity; impact does.

## 2. Mobile key boundary

### Where the error comes from

Symptoms: on Android an error at the moment the key is requested; on iOS the key is issued but the door does not open. The credential is created in the key provider's SEOS cloud; when the registration attempt hits an internal server error on the provider's side, the request is blocked before it reaches the local server at the hotel — our side never receives a valid key. What we can see is our own log, which may show a room-number error for the request. Ask first whether the key ever worked and whether the room is new; then read the logs, quote the error and refer the hotel to the key provider's support. Do not blame the provider without the log line, and do not promise a fix on our side for a provider-side error.
<!-- evidence: FW-005 -->

### Joint sessions

The hotel or its key-card support team often asks for a joint troubleshooting session at a fixed time (given in UTC). Agree the slot, name an engineer internally, and be online — the session is mostly the provider checking their cloud while we confirm what reaches our server. Sessions get rescheduled; confirm the new time in the ticket. The outcome to write down is where the request stopped (provider cloud, our server, the lock) so the next ticket does not start from zero.
<!-- evidence: FW-005 -->

## 3. Cards and encoders

### Card types and the "demagnetised" myth

Guest cards are **MIFARE Classic 1K**; initialisation and audit cards are **4K**. The encoder is the **ACR1281U-C8**. The cards carry a chip, not a magnetic stripe, so they do not "demagnetise"; "we re-issue the cards for one room every day" is a lock, reader or clock problem, not the cards. All cards are bound to the **4-digit hotel code**: cards encoded at another installation, 1K or 4K, will neither read nor write here — by design, for security; the property needs blank cards, and there is no way to "erase" a foreign card into a usable one. When 4K audit cards fail to encode, update the encoding software to the latest version first (we send the distribution link), then retest.
<!-- evidence: FW-055, FW-231 -->

### Elevator readers and clocks

A card that opens the room but is refused at the elevator, or works at the elevator only after being presented at the room door, points to unsynchronised clocks between the locks and the elevator readers. Have the hotel synchronise the time on the locks and on the elevator readers, then take an audit from the lock and from the reader after the next refusal — in Upkey the first icon in the device settings is Audit. Ask for the exact time of the refusal and whether the reader gave any indication, so the audit lines can be matched to the event. If Upkey does not start (with or without VPN), solve that first — without audits we are guessing.
<!-- evidence: FW-055 -->

## 4. Portal and app operations

### Passwords and look-alike logins

Password-reset mails from the access-control portal may not arrive; we send the password to the user privately (never by e-mail to a third party) and the user changes it after login under My user → change password. If a correct-looking password is refused while the same pair works for us, check the stored login character by character: logins have been saved with a look-alike first character (a lowercase "l" where an "i" was expected) — have the user copy the login from the user card and paste it into the login field. There is no separate step-by-step for adding and renaming locks; the general access-control manual covers it.
<!-- evidence: FW-151 -->

### Areas and default access for common zones

For guest cards to open a common zone (gym, spa, pool) automatically: create the Area; initialise the lock into that area (bind the device to it — an area without a bound lock does nothing); then in the area's default-access settings choose the rooms whose guests receive access on check-in. The customer does not have to edit every room by hand.
<!-- evidence: FW-152 -->

### Deleting a device or room; hold-open; reset

To remove a lock bound to the wrong record: in the mobile app open the lock's properties and choose delete device; the room disappears from the app's main menu, and after 10–15 minutes the portal allows deleting the device and the room. If the room is not visible in the app at all, the lock was most likely added from an admin user rather than from the master account — locks added by an admin user are visible to that user only; repeat the operation from the master account. A door that stays unlocked is usually the "hold open" ("leave open") checkbox on that lock. We hold no factory-reset procedure for a lock model (Omnitec Slim included) — refer to the manufacturer's documentation.
<!-- evidence: FW-151, FW-231 -->

## 5. Outages and emergencies

### Vendor server outages

Symptoms: the osaccess service returns a configuration error and cards do not write; the portal does not authenticate and refreshes with errors; nothing works through the PMS either. These are outages on the lock vendor's servers. Say so, keep the customer updated, and confirm when it works again. Workaround while it lasts: comment out the hosts-file entries that were added earlier for the service and connect through a VPN; a workstation that cannot run a VPN has no other path until the vendor recovers. No third-party software can write our cards, and the pre-cloud software is not an option. A local (on-premises) server version is in development — no dates.
<!-- evidence: FW-090, FW-186, FW-194 -->

### Writing a card at the lock

Emergency card writing while the cloud is down (the mobile app must start): walk to the lock; wait until the lock appears in the app (the battery level shows next to the room); tap the gear icon; choose creating a MIFARE card; pick permanent or temporary and the validity period; press Create; hold the card to the lock. One beep from the lock confirms the write. Inconvenient with many rooms, but it is the only offline path.
<!-- evidence: FW-194 -->

## 6. SmartPass registration codes

### Temporary, then permanent

After a reinstall of the encoding workstation, SmartPass asks for a registration code, and the built-in "Send e-mail" request may fail with an error. Ask for the hotel card with the details and the code the program shows; issue a temporary registration code right away so check-ins are not blocked, then send the permanent code when it is ready. Codes go to the property's contact, not to a third party. The commercial side of registration codes is in [Licensing and Commercial Requests](Licensing-and-Commercial-Requests).
<!-- evidence: FW-161 -->

## 7. Triage rows

### T-LOCK-01 — Mobile key fails: Android error at request, iOS key issued but door stays closed
**Symptom.** The app cannot obtain a key on Android; on iOS the key appears but the door does not open. Often "it worked at rollout".
**First checks.** Did it ever work; is the room new; our logs for the request (room-number error?); provider status.
**Typical cause.** Internal server error in the key provider's SEOS cloud during registration — blocked before our server.
**Owner.** Key provider (mobile key); Acme Support confirms what reaches us.
**Fix or answer.** Quote the log line, refer the hotel to the provider's support, join the joint session if asked. E-001 if a guest is locked out.
**Also asked as.** «мобильный ключ не открывает дверь», «ошибка при получении ключа», "mobile key fails to open door", "key issued but the door will not open"
<!-- evidence: FW-005 -->

### T-LOCK-02 — Guest cards "demagnetise" or are refused at the elevator
**Symptom.** Cards for one room stop working soon after encoding; the elevator reader refuses a card that the room door accepts.
**First checks.** Which room; only guest cards for that room; audit from the lock and the elevator reader after a refusal (Upkey → Audit); exact time and reader indication.
**Typical cause.** Clocks out of sync between locks and elevator readers; cards do not demagnetise.
**Owner.** Hotel IT (time sync, audits); Acme Support reads the audits.
**Fix or answer.** Synchronise time on locks and readers, collect audits, match the event; explain MIFARE 1K cards are chip cards.
**Also asked as.** «карты размагничиваются», «карта не срабатывает в лифте», "keys stop working after a day", "card not accepted at the elevator"
<!-- evidence: FW-055 -->

### T-LOCK-03 — 4K init/audit cards will not encode; cards from another hotel do not work
**Symptom.** Encoding an initialisation or audit card errors on the ACR1281U-C8 while 1K guest cards work; cards brought from another property are unreadable.
**First checks.** Software version (update first); which cards — own blanks or cards from another installation.
**Typical cause.** Old encoding software; or cards bound to another hotel's 4-digit code (expected).
**Owner.** Acme Support.
**Fix or answer.** Update the software and retest; explain that foreign cards can never be used here and blank cards are needed.
**Also asked as.** «не кодируются карты инициализации 4К», «карты из другого отеля не читаются», "audit card encoding error", "cards from another hotel not working"
<!-- evidence: FW-231 -->

### T-LOCK-04 — Cannot log in to the access-control portal; reset mail never arrives
**Symptom.** Self-service reset mails do not arrive; a password we confirmed as correct is refused for the admin login.
**First checks.** Property in Russia; which account; copy-paste the login from the user card (look-alike characters); we test the pair ourselves.
**Typical cause.** Mail not delivered; a login stored with a look-alike character.
**Owner.** Acme Support.
**Fix or answer.** Send the password privately; user changes it under My user → change password; have them paste the exact login.
**Also asked as.** «восстановить пароль к порталу системы контроля доступа», «не пускает с правильным паролем», "access control portal password reset", "correct password refused"
<!-- evidence: FW-151 -->

### T-LOCK-05 — Cards not writing: osaccess configuration error or portal unreachable
**Symptom.** Encoding stops for the whole property; the service reports a configuration error; the portal fails to authenticate; the PMS path fails too. Sometimes it opens through a VPN abroad.
**First checks.** Since when; vendor status; hosts-file entries present; can the workstation run a VPN.
**Typical cause.** Outage on the lock vendor's servers.
**Owner.** Lock vendor; Acme Support relays status.
**Fix or answer.** Comment out hosts entries + VPN while it lasts; write emergency cards at the lock via the mobile app; no third-party software. Confirm recovery. P1 during arrivals.
**Also asked as.** «не записываются карты, osaccess ошибка конфигурации», «не открывается OS Access», "cards not encoding, osaccess error", "lock system down"
<!-- evidence: FW-090, FW-186, FW-194 -->

### T-LOCK-06 — Guest cards should also open a common area
**Symptom.** "All guest cards must open the gym/spa"; an error while configuring room access to the zone; unclear whether every room must be edited.
**First checks.** Area created; lock initialised into the area; default access rooms selected.
**Typical cause.** Lock not bound to the area yet.
**Owner.** Hotel IT with Acme Support guidance.
**Fix or answer.** Initialise the lock into the area, then select the rooms in the area's default access; no per-room editing.
**Also asked as.** «доступ гостевых карт к общей зоне», «ошибка при настройке доступов комнат», "guest cards for the fitness room", "area default access"
<!-- evidence: FW-152 -->

### T-LOCK-07 — Cannot delete a device or room; lock bound to a wrong record; door stays open
**Symptom.** A lock hangs on a non-existent room and the delete button is inactive; the room is not visible in the app; or a door does not lock at all.
**First checks.** Master account or admin user used when the lock was added; app view of the lock; the "hold open" checkbox for the door.
**Typical cause.** Lock added by an admin user (visible only to them); hold-open enabled.
**Owner.** Hotel IT with Acme Support guidance.
**Fix or answer.** delete device from the lock's properties in the app (master account), wait 10–15 minutes, delete device and room in the portal; untick hold-open. Factory reset: manufacturer's documentation.
**Also asked as.** «не удаляется устройство из несуществующего номера», «дверь остаётся открытой», "cannot delete lock from a room", "door left unlocked"
<!-- evidence: FW-151, FW-231 -->

### T-LOCK-08 — SmartPass asks for a registration code; "do you support our locks?"
**Symptom.** After a reinstall SmartPass demands a registration code and Send e-mail errors; or an outsourcer asks whether we support osaccess at a property.
**First checks.** Hotel card and the code shown; property location (Russia or not).
**Typical cause.** Reinstall cleared the registration; support boundary question.
**Owner.** Acme Support (Russia); manufacturer documentation elsewhere.
**Fix or answer.** Temporary code now, permanent code to follow. Outside Russia: no support from us, no regional partner list — manufacturer's documentation.
**Also asked as.** «SmartPass запрашивает код регистрации», «оказывается ли поддержка osaccess», "SmartPass registration code", "is osaccess supported in our region"
<!-- evidence: FW-161, FW-219 -->
