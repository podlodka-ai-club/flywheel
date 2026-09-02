<!-- meta
id: hotsign-digital-signage
type: product
audience: support
tags: [hotsign, digital signage, signage, playlists, schedules, push updates, raspberry pi, player, infopanel, corridor monitor, black screen, firmware, pairing code, not connected]
-->

# HotSign Digital Signage

**Read this when:** a ticket is about screens in public areas — playlists, schedules, Push Updates, Raspberry Pi or infopanel players, a black screen or a "Not Connected" message — rather than about in-room TVs.

---

## 1. What it is

Acme HotSign is the digital-signage product: a **separate CMS** (its own address, its own accounts) with playlists, schedules and zones, plus the players that show them. It is not the admin panel that drives TVs and tablets — a screenshot with Playlists and Schedules in it means HotSign. [Admin Panel and CMS](Admin-Panel-and-CMS) explains the split.
<!-- evidence: FW-167 -->

### CMS vocabulary

Content is organised in playlists (the ordered set of images and videos); a playlist is assigned to a schedule; schedules belong to zones — the physical areas of the property such as a lobby, lift hall, spa or reception screen. Media (logos, promo slides, videos) is uploaded to folders and then added to the playlist. "Push Updates" is the button that tells players to fetch the current content now. When asking about a problem, always get the schedule name, the zone and what the screen shows now — "the panels don't update" is not diagnosable on its own.
<!-- evidence: FW-167, FW-170, FW-149 -->

### Players

Players are the devices behind the screens: Raspberry Pi 4 boards flashed with our image `Hotsign-com-6.8.img`, infopanels (all-in-one displays in meeting rooms and public areas), corridor monitors and dashboards. Every player has a name in the HotSign admin and an online/offline status we can see. A new player that reaches the server shows a pairing code on the server page so it can be attached to the property. When a partner says "corridor monitor" or "panel", ask whether it is a HotSign player or a hotel TV in a Display Group — content for TVs goes through the CMS content menu, not through HotSign.
<!-- evidence: FW-177, FW-141, FW-069, FW-170, FW-149 -->

## 2. Accounts

HotSign accounts are separate from admin-panel accounts. The forgot-password flow sends a reset mail through the same mailer we use elsewhere.

### Login and forgotten passwords

When a user says the reset mail never arrives: check our mailer — it shows the delivery status per address. If the status is sent, the mail was handed to the recipient's mail provider, so the user should check spam and junk first; deleting and recreating the account does not help. We then set a specific password for the account manually and send it to the user privately (not to a third party, not in the ticket thread), asking them to confirm login and change the password. Which property, which user and which login page belong in the first reply — a partner user may hold accounts at several properties.
<!-- evidence: FW-045 -->

### New interface after an update

After a HotSign update the interface changes and users ask for "an instruction". The user manual is linked inside the HotSign admin — send a screenshot of where it sits. Training on the new administration panel is arranged through the partner that services the property; loop the partner's contacts in rather than running training from support. Do not promise the old interface back.
<!-- evidence: FW-125 -->

## 3. Publishing

### Push Updates, schedule days and reboots

The normal path is: edit the playlist, save, press Push Updates, wait. If a player only picks up content after a reboot, its build is old — the fix is a build update (section 4), not repeated pushes. Properties often refresh images on fixed days and expect the schedules to switch that day; when playlists edited on those days do not show on the screens, first confirm the players are online (status in the admin) and ask the hotel to reboot the players — in practice a reboot resolves most "content not refreshing" reports, and only then do we look at the specific schedule. Ask for the exact schedule and zone that did not update, and what the screen shows now.
<!-- evidence: FW-149, FW-167 -->

## 4. Player builds

### 4.x legacy and the current build 5.37.12

Player application builds fall into two families: the legacy 4.x line and the current line, whose working build is **5.37.12**. We cannot pin or roll a device to an arbitrary version ("make this one the same 4.x as the others"); the option is to move it to the current build, which we do remotely from the admin — the device reboots itself and the version shows in the admin afterwards. Player **firmware** (the image side) is also updated remotely by support, across all affected devices at once, after the fix is confirmed on one test screen. Ask for the device names from the admin when only some players misbehave, and say what version they are on now.
<!-- evidence: FW-149, FW-170 -->

## 5. Images and video

### Black screen with the file name in the corner

A logo or image that plays as a black screen with the file name in the top-left corner — on Raspberry Pi players only, other player types fine, any file, every RPi — is a player firmware problem, not a content problem. First confirm the RPi was set up per the instruction and with our image; when all RPis are affected, ask for one test screen (the partner's office screen is ideal), update its firmware, have them confirm the image shows, then update the rest remotely and tell them nothing is needed on site. Players in this state stay online and keep showing the cached default picture, which is why it looks like "the schedule is ignored".
<!-- evidence: FW-170 -->

### Video plays as a black screen while logos work

When videos show black but logos display, ask for the video link (or a sample) and reproduce the schedule in our lab. If it plays on both the old and the new build in the lab, the device is the problem: reboot it (a remote reboot may fail — ask for a manual one), and if that does not help, reinstall the image on the device; the image link with its password and the setup instruction go to the customer separately, never in the ticket body.
<!-- evidence: FW-059 -->

## 6. Setup and connectivity

### "Not Connected" on boot

A freshly flashed Raspberry Pi 4 that shows "Not Connected" over Wi-Fi and over LAN, while a PC on the same LAN opens the signage server page and sees the pairing code, is running the wrong image or cannot reach the server from its own network. Point the customer to `Hotsign-com-6.8.img` (RPi 4), ask them to reflash, then run the diagnostic command in the player console and send us the output; a boot-time error message is worth a photo. Use a LAN cable during setup so Wi-Fi can be ruled out.
<!-- evidence: FW-177 -->

### Where the files are

The RPi image and player firmware live in our firmware file repository for the digital-signage builds; share the link privately in the ticket, never in a public place, together with the setup instruction. Customers without access to the documentation portal ask support for it — that is a normal request, not a security exception. Remote access to players and servers is described in [Remote Access and Connectivity](Remote-Access-and-Connectivity).
<!-- evidence: FW-177, FW-170 -->

### Dashboard slow or unresponsive

"The new dashboard is hard to open and freezes" is passed to the team for review with the property, the browser and a time; there is no self-service fix. Acknowledge, pass on, update the partner. Automatic acknowledgements from the partner's own helpdesk land in the thread and are not new tickets.
<!-- evidence: FW-069 -->

## 7. Triage rows

### T-SIGN-01 — Cannot log in to HotSign; reset mail never arrives
**Symptom.** A user cannot log in to the HotSign CMS; "forgot password" was used but no mail came.
**First checks.** Which property and which user; spam/junk checked; our mailer's delivery status for that address.
**Typical cause.** The recipient's mail provider dropping the reset mail (our mailer says sent).
**Owner.** Acme Support.
**Fix or answer.** Set a password manually, send it privately to the user, ask for confirmation and a password change. Do not delete and recreate the account.
**Also asked as.** «пользователь не может войти в Hotsign», «письмо для сброса пароля не приходит», "cannot log in to Hotsign", "no password reset email from HotSign"
<!-- evidence: FW-045 -->

### T-SIGN-02 — Interface changed after an update; user asks for a manual or training
**Symptom.** "The HotSign interface changed, please send instructions on managing content on the screens."
**First checks.** Which property; is the user able to log in; which task they cannot complete.
**Typical cause.** A HotSign update with a new administration panel.
**Owner.** Acme Support (manual), partner (training).
**Fix or answer.** Screenshot of where the manual is linked inside the HotSign admin; loop in the partner's contacts to arrange training on the new panel.
**Also asked as.** «изменился интерфейс HotSign, нужна инструкция», "new HotSign interface, need a manual", "training on the new signage panel"
<!-- evidence: FW-125 -->

### T-SIGN-03 — Push Updates does nothing; content appears only after a reboot
**Symptom.** One infopanel ignores Push Updates and shows new content only after a restart; other panels update normally; the app version on it differs.
**First checks.** Device name and app version in the admin; versions on the working panels; is the device online.
**Typical cause.** Old player build on that device.
**Owner.** Acme Support.
**Fix or answer.** Update the device remotely to the current build (5.37.12) — an arbitrary older version cannot be pinned; the device reboots; ask the user to verify.
**Also asked as.** «инфопанель не обновляет контент по Push Updates», «обновите App version на устройстве», "Push Updates has no effect", "panel updates only after restart"
<!-- evidence: FW-149 -->

### T-SIGN-04 — Playlist or schedule edits do not show on the panels
**Symptom.** Images added to a folder and to the playlists on the usual update day are not on the screens; the old content stays.
**First checks.** Is it HotSign (Playlists screenshot) or the TV/tablet CMS; which schedule and zone; players online; players rebooted.
**Typical cause.** Players that need a reboot; less often a schedule not assigned to the zone.
**Owner.** Acme Support; hotel IT reboots on site.
**Fix or answer.** Ask for a reboot of the affected players first, then re-check the named schedule together. Confirm in the ticket that the content is on the screens.
**Also asked as.** «панели не подхватывают обновления контента», «правки в Playlists не отображаются», "panels not refreshing after playlist changes", "signage shows old content"
<!-- evidence: FW-167 -->

### T-SIGN-05 — Black screen with the file name in the corner after uploading a logo
**Symptom.** Raspberry Pi players show a black screen with the file name top-left after a logo or image is scheduled; other player types display it; devices stay online with the default picture.
**First checks.** RPi set up per instruction with our image; how many players; device names; a test screen available.
**Typical cause.** Player firmware on the RPi.
**Owner.** Acme Support.
**Fix or answer.** Update firmware on one test screen, confirm, then update all remaining players remotely; nothing to do on site. Treat as high priority when every public screen is blank.
**Also asked as.** «чёрный экран и имя файла в углу», «логотипы не загружаются на Raspberry», "black screen with file name on RPi players", "logos not loading on Raspberry"
<!-- evidence: FW-170 -->

### T-SIGN-06 — Video shows a black screen while logos work
**Symptom.** Any video scheduled on a player plays as a black screen; logos and images are fine.
**First checks.** Video link or sample; player name and zone; manual reboot done; reproduce the schedule in the lab.
**Typical cause.** The device itself (image state), when the lab plays the same schedule on old and new builds.
**Owner.** Acme Support; customer reflashes on site.
**Fix or answer.** Reboot; if unchanged, reinstall the image — send the image link with password and the setup instruction separately.
**Also asked as.** «видео не воспроизводится, чёрный экран, логотипы работают», "video plays black on the player", "black screen instead of video"
<!-- evidence: FW-059 -->

### T-SIGN-07 — New Raspberry Pi shows "Not Connected"
**Symptom.** A freshly flashed RPi 4 shows "Not Connected" on Wi-Fi and on LAN; a PC on the same LAN opens the server page with the pairing code; an error flashes during boot.
**First checks.** Which image was flashed; LAN cable used; photo of the boot error; output of the diagnostic console command.
**Typical cause.** Wrong image for the board, or the player cannot reach the server from its network.
**Owner.** Acme Support; hotel IT for the network.
**Fix or answer.** Reflash with `Hotsign-com-6.8.img`, run the diagnostic command, send the output; then pair with the code on the server page.
**Also asked as.** «Raspberry показывает Not Connected», «нужен образ для Raspberry Pi 4», "Not Connected on the signage player", "image for Raspberry Pi 4"
<!-- evidence: FW-177 -->

### T-SIGN-08 — Dashboard slow, or unclear whether the ticket is HotSign at all
**Symptom.** "The new dashboard is hard to open and freezes"; or a question about uploading PDFs/images "to the corridor monitor".
**First checks.** Which surface — HotSign CMS, admin panel content menu, or a TV in a Display Group; browser and time of the slowness; screenshot.
**Typical cause.** Product performance (passed to the team), or a confusion between HotSign and the CMS that drives TVs.
**Owner.** Acme Support; the team for performance.
**Fix or answer.** Clarify the device; PDFs and JPGs for TVs go through the CMS content menu, signage content through HotSign. Pass performance reports on with details and keep the partner updated.
**Also asked as.** «новый дашборд тормозит и зависает», «загрузка PDF на монитор в коридоре», "dashboard unresponsive", "upload PDF to the corridor display"
<!-- evidence: FW-069, FW-141, FW-167 -->
