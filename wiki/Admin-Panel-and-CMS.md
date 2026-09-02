<!-- meta
id: admin-panel-and-cms
type: product
audience: support
tags: [admin panel, cms, admin v2, legacy cms, login, sso, password reset, publish, menu builder, users, roles, regions, reports, media, templates]
-->

# Admin Panel and CMS

**Read this when:** a partner or hotel cannot log in to the admin panel, cannot find a function after the move to the new panel, or content that was saved and published does not show up on the TVs or in the app.

---

## 1. The two panels

Two panels coexist while properties are migrated: the **old admin panel** (partners say "legacy CMS", "the old link", "the self-service portal") and the **new admin panel** ("admin v2", "the new CMS"). Admin v2 is still beta for some partners, so a partner's IT may tell its users that the old CMS remains the working one. Both are ours; the question is which function the user needs.

### What lives where during the migration

User management (creating and editing user profiles, roles), notification settings, order statuses, reports and the staff list have moved to the new admin panel; in the old portal a partner sees only the users that were created there, which is where "I can't see my colleague" tickets come from. Guest Wi-Fi (HSIA) management stays in the HSIA portal — see [Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA). Digital signage has its own CMS — see [HotSign Digital Signage](HotSign-Digital-Signage); a screenshot of playlists and schedules means the user is in HotSign, not in the CMS that drives TVs and tablets. Content editing and publishing exist in both panels; when publishing misbehaves, ask the user to publish through the primary panel for that property and verify the result ourselves. Menu-item text edits are explained with screenshots of both panels, because both remain in use.
<!-- evidence: FW-201, FW-137, FW-167, FW-050, FW-221 -->

### Why the old panel stays reachable, and which panel the ticket is about

Some functions are not in the new panel yet. Reported gaps: when a service cover photo is replaced, the new panel neither shows the image size requirements nor warns that the upload failed because of the size; and service pricing, which in the old panel was set in the hotel services section, has no obvious place in the new one. We did not close the old panel and we do not tell partners to stop using it. "The old admin panel has disappeared" is a network or browser problem on their side (section 3), never a decommissioning — say so plainly, then test over mobile data. Every admin-panel ticket needs the surface (Q-002 in [Ticket Intake Checklist](Ticket-Intake-Checklist)): old or new panel, which region, which login option (Q-008), and a full screenshot with the address bar and the error text. "Neither the new nor the old link works" usually means one cause on the browser or network side — cookies, a blocked URL, a cloud incident — not two separate bugs. On partner tickets also confirm which property (Q-001) before touching any account.
<!-- evidence: FW-040, FW-022 -->

## 2. Regions and URLs

The cloud has three regions — EU, NA and RU — and each region has its own admin panel addresses (old and new versions). A property additionally has a local in-property link served inside the hotel network. An account lives in one region; the same credentials do not work in another region's panel.

### Wrong region, three ways it shows

A user on the wrong regional panel sees one of: "Something goes wrong!" / credentials incorrect although the same password works elsewhere; changes that save without error but never reach the TVs; or a panel that hangs and never loads the page. Before touching passwords, check which panel the user opened (screenshot with the address bar) and send them to the panel for their region. Typical case: a partner working properties in several regions keeps one bookmark and opens every property with it. Hotels in Russia use the RU addresses (new and old); the EU panel is not theirs.
<!-- evidence: FW-169, FW-076, FW-162 -->

### First login after a transfer; the endless spinner

When an account is moved to another region, or logs into its correct regional panel for the first time, the transfer can take 5–10 minutes; during that time the panel shows an endless spinning wheel. Ask the user to wait and retry; if it still spins after that, escalate to R&D with the login and the region. Until a publish goes through from the right panel, the public link and the local in-property link can show different versions of the content — "the two links are on different versions" — and after a successful publish both are in sync again.
<!-- evidence: FW-076 -->

## 3. Logging in

The login page offers two options: **option 1** — login and password; **option 2** — "Login with SSO". Always ask which one the user tried — the fix differs.
<!-- evidence: FW-003, FW-008, FW-169 -->

### White screen or a hang after the password

A white screen after the password, on more than one device, while the old panel still accepts the same account, is an account-state problem on the new panel, not a network problem. Send the account-recovery e-mail (tell the user to check spam), and if that does not help ask them to use "Login with SSO" — new-panel accounts may be redirected to SSO. If both panels are unreachable for everyone at once, check for a cloud incident before troubleshooting anyone's browser: an infrastructure problem at the cloud provider takes both panels down, and content catches up automatically once it is over.
<!-- evidence: FW-008, FW-224, FW-041 -->

### "Something goes wrong!" and password resets

"Something goes wrong!" on login means the credentials were rejected. Check the region first; then send a password-reset link and ask the user to log in with option 1 (not SSO). Reset links are valid for 60 minutes. If "the link does not work", ask the user to forward the reset mail and say whether they use option 1 or 2; a malformed reset link is an R&D fix. If the mail never arrives: spam folder first; our mailer shows the delivery status, and when it says sent the problem is at the recipient's mail provider — support then sets a password manually and sends it to the user privately, never to a third party and never into the ticket thread. Ask the user to change that password after the first login.
<!-- evidence: FW-169, FW-003, FW-137, FW-224 -->

### Cookies, blocked URLs and browsers

Cookies must be enabled — with cookies off the panel does not open at all, on either link. A hotel network or its ISP can block the panel URL; test from a smartphone on mobile data and switch any VPN off. If the old link is blocked and the new one is not, the new panel is an acceptable alternative for the moment; the hotel IT unblocks the URL. "The app link does not always open in the browser" on a phone depends on the device's own settings, not on the phone model or OS. More on what we can and cannot reach: [Remote Access and Connectivity](Remote-Access-and-Connectivity).
<!-- evidence: FW-022, FW-003, FW-040, FW-050 -->

## 4. Users and roles

Accounts are created and edited in the new admin panel. The standard role for a hotel manager who must edit content and settings is **Administrator**.

### Creating an account, deactivating a leaver

Create the profile in the new admin panel, assign Administrator, and send a temporary password that the user must change after the first login. When a new employee replaces someone, deactivate or delete the predecessor's profile and say explicitly whether any settings were carried over. Notification preferences are self-service in the Notifications tab of the profile; which services a staff user sees (for example In-Room Dining orders) is a checkbox in the profile — after we change it the user must log in again. The order side is in [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App).
<!-- evidence: FW-137, FW-225 -->

### Several properties, one account

A user can have several properties on one account and switches between them from the list at the top of the page, without logging out. After a property is added the user must log out and back in — until then the list does not show it. Partners cannot always grant access themselves: when the colleague already has access to another property of the group, or the panel says the user "already exists", support adds the user to the property and sets the role, or asks the team to do it. SSO accounts appear in the staff list only after the user has logged in. If the user still does not appear after a re-login, reset the password or send new credentials privately and have the team review the account.
<!-- evidence: FW-137, FW-224, FW-146 -->

## 5. Publishing rules

Nothing reaches a TV, a tablet or the app until it is published. Most "content not updating" tickets are solved by running this list in order.

### The publishing checklist

1. Was Publish pressed after the last save? Propagation takes up to ~20 minutes; force it on one TV with code 100 or a power cycle.
2. Does the section exist in Menu Builder? A page that is saved and published but has no menu entry never shows.
3. Is the item switched on, with the right device types — TV, WEB, GUESTAPP? A menu without WEB and GUESTAPP errors in the guest app while the TV is fine; the same logic hides things from the TV.
4. Is the TV in the right Display Group? Sections and apps are shown per group.
5. Is there a cloud incident? Short cloud outages make Publish fail silently; once over, publish again.
6. Still wrong: support republishes or publishes manually and tells the user; if TV and app still differ, the update mechanism is at fault → R&D.
<!-- evidence: FW-004, FW-145, FW-182, FW-165, FW-163, FW-109, FW-050, FW-154, FW-160 -->

### Preview

The preview in the panel shows what will be published. When preview does not work, tell the user not to publish blind: a broken preview and a broken TV screen after publishing usually share one cause, and the safe move is for support to republish. "It is gone from the menu and from the preview but still on the TV" means the publish did not go through, not that the deletion failed. Publishing from a wrong regional panel produces the same picture.
<!-- evidence: FW-154, FW-050, FW-076 -->

## 6. Media specs

### Images

Images must be in a supported format. "Changes not saving" with an error on save is almost always the image file itself — ask for the actual file (not a screenshot of the error) and upload it ourselves to check. Colour shifts or greyed images on the TV: ask for the originals, re-upload, then code 100 or a reboot on one TV. Section cover images (the cover of a rooms section or of an about-the-hotel page) are changed in a dedicated place in the CMS, not inside the room or page item; when a cover still does not update after that, it is a CMS bug → R&D, and support uploads the cover manually meanwhile. The new panel does not yet show size requirements or an upload-failed warning — state the requirement in the reply.
<!-- evidence: FW-076, FW-004, FW-067, FW-040 -->

### Video, PDF and "corridor monitors"

Videos: no more than 3 GB; recommend 720p mp4. Support uploads them to the TV server under `video/…`, and the user then enters the directory and file name in the video field of the section, saves and publishes. Files far above the limit are sent back for re-encoding first — oversized files hurt playback and stability. PDFs and JPG images are uploaded through the CMS content menu. Welcome videos go through streameradmin — see [TV Channels and Video Streaming](TV-Channels-and-Video-Streaming). When a user asks about a "corridor monitor", ask which device that is: a TV running Acme TV (CMS content, Display Groups) or a HotSign player (its own CMS, [HotSign Digital Signage](HotSign-Digital-Signage)).
<!-- evidence: FW-145, FW-141 -->

## 7. Content requests support performs

Self-service is the goal, but support and the content managers still do content on request. Reply with what was done and where, so the user can do it next time.
<!-- evidence: FW-221 -->

### Typical requests

- Welcome and promo videos: re-encode if needed, upload under `video/…`, set the path in the section, publish, ask for a TV reboot.
- PDF menus at a specific level (for example a residences account rather than the hotel account): passed to the content managers with the files; confirm the target account before handing over.
- Text edits in menu items: answer with screenshots showing the place in both panels.
- Removing a past event or an expired special offer: the user deletes it in their regional panel; if the panel is unreachable, we remove it and ask for a TV reboot.
- Interface languages on or off per property: support switches them.
- Working-hours text of a menu: correct it and ask them to check the TV and the web app; the ordering hours themselves are in [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App).
- Service charge percentage: self-service in the CMS, then publish.
<!-- evidence: FW-145, FW-225, FW-221, FW-162, FW-210, FW-197, FW-113 -->

### Welcome page greeting

The greeting comes from the PMS and reads "Dear {Surname}" — a first name needs the PMS to send it. For a personalised greeting the layout must be greeting first, then the welcome message in its dedicated field; a greeting baked into the artwork cannot be personalised. Long welcome texts run into the size limits of the welcome window — ask for a shorter text, or for the artwork without text, and adjust position and size on request. TV-side behaviour is in [Acme TV](Acme-TV).
<!-- evidence: FW-239 -->

## 8. Templates and mailings

### E-mail mailing templates and marketing notifications

Guest e-mail mailings have a templates section in the panel. If that section shows an error instead of the templates, and does so at every property that uses mailings, it is a platform bug: hand it to R&D as E-008 (same defect at several properties, see [Escalate or Answer](Escalate-or-Answer)) and do not troubleshoot browsers. Give status on request, without release dates. Marketing notifications to guests (pop-ups on tablets and in the app) are a different mechanism: generated in the cloud after check-in with a per-guest "delivered" flag — [In-Room Tablets and Room Control](In-Room-Tablets-and-Room-Control) explains why only one device in a room may show them. Order and overdue notification e-mails go through Mailgun — see [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App).
<!-- evidence: FW-029 -->

### Check-in templates and registration links

Check-in templates carry the registration link a guest follows; it must point to the hotel's check-in web app. Templates that change without the partner's action, or links that suddenly point elsewhere, are a security signal (E-010): check who has access to the property, when the template was last saved and from which account, restore the template, and report what was found. A repeat report is handled as an incident, not as a content fix.
<!-- evidence: FW-006 -->

## 9. Channels and devices views

### TV channels, Connected devices, Guest list, rooms

The channel list is edited under Application → TV channels; a new channel needs Publish like any content and appears on the TVs afterwards. Stream addresses, VLC tests and provider problems are in [TV Channels and Video Streaming](TV-Channels-and-Video-Streaming). Connected devices lists every registered TV with model, MAC and firmware. A room with an empty row (no MAC, no model) means the TV could not authorise — most often the licence limit; see [Licensing and Commercial Requests](Licensing-and-Commercial-Requests). Rooms are created automatically when a TV authorises for the first time; nobody creates rooms by hand. The Guest list shows the guests transferred from the PMS — the first place to look when a TV greets "Guest" ([Acme TV](Acme-TV), [PMS Integration](PMS-Integration)). A room deleted from the CMS by mistake can be added back — the hotel can re-create it, or support restores it on request; ask for the room number; a TV registered under a wrong room number is re-registered with code 1105.
<!-- evidence: FW-109, FW-168, FW-156, FW-163 -->

## 10. Reports

Statistics on what guests ordered are self-service in the new admin panel: Reports → Shop Reports and Service Reports, plus the Sales reports block. Answer with the path and a screenshot from the new panel, and add that all properties are being moved to it, so the user knows where to look next time. Support does not compile reports by hand. Order statuses, overdue reminders and staff notifications are in [In-Room Ordering and Staff App](In-Room-Ordering-and-Staff-App).
<!-- evidence: FW-222 -->

## 11. Triage rows

### T-ADM-01 — White screen or hang after entering the password
**Symptom.** After the password is entered the page stays white or "hangs"; often on the new panel only, while the old panel still lets the same account in.
**First checks.** Which panel and region (screenshot with address bar); option 1 or SSO; tried on more than one device; is anyone else locked out right now (cloud incident).
**Typical cause.** Account state on the new panel (needs recovery or SSO), or a platform-wide cloud incident that takes both panels down.
**Owner.** Acme Support; R&D if recovery and SSO both fail.
**Fix or answer.** Send the account-recovery e-mail (check spam), then ask for "Login with SSO". During a cloud incident give the estimate and confirm when both panels are back; content republishes automatically.
**Also asked as.** «после ввода пароля система зависает», «белый экран при входе в админку», "white screen after login", "the portal hangs after the password"
<!-- evidence: FW-008, FW-041 -->

### T-ADM-02 — "Something goes wrong!" or credentials rejected
**Symptom.** Login fails with "Something goes wrong!" or "credentials incorrect", while the same password works on the support portal or for a colleague.
**First checks.** Which regional panel was opened; which region the account belongs to; option 1 or 2 tried.
**Typical cause.** Wrong region — the account lives in another region's panel.
**Owner.** Acme Support.
**Fix or answer.** Point the user to the right regional panel. If it still fails, send a reset link (valid 60 minutes) and ask them to log in with option 1, not SSO.
**Also asked as.** «не могу войти в админку, пароль не подходит», «неверные учётные данные», "Something goes wrong on login", "credentials incorrect in the EU panel"
<!-- evidence: FW-169, FW-076, FW-162 -->

### T-ADM-03 — Password-reset link does not work or never arrives
**Symptom.** The reset mail arrives but the link "does nothing", or no mail arrives at all after "forgot password".
**First checks.** Spam folder; is the link older than 60 minutes; forward us the mail; option 1 or 2; is the user on the hotel network (test over mobile data).
**Typical cause.** Expired link, recipient mail provider dropping the mail (our mailer shows sent), or — rarely — a malformed link generated by the platform.
**Owner.** Acme Support; R&D for a malformed link.
**Fix or answer.** Resend the link. If mail is not getting through, set a password manually and send it privately to the user; ask them to change it after login. A malformed link goes to R&D; tell the user to retry once R&D confirms.
**Also asked as.** «ссылка для сброса пароля не работает», «письмо для восстановления не приходит», "reset link is broken", "no password reset email"
<!-- evidence: FW-003, FW-224, FW-137 -->

### T-ADM-04 — Panel URL does not open from the hotel network
**Symptom.** The old or the new link (or both) does not open from the hotel; sometimes "access to the old admin panel disappeared".
**First checks.** Full screenshot with address bar and error text; cookies enabled; try from a smartphone on mobile data; VPN off; does the other link open.
**Typical cause.** Cookies disabled in the browser, or the hotel network / ISP blocking the panel URL. We do not block or close panels.
**Owner.** Hotel IT (block) / the user (browser); Acme Support confirms the panel is up.
**Fix or answer.** Enable cookies; if mobile data works, tell hotel IT to unblock the URL and disable VPN; offer the other panel meanwhile.
**Also asked as.** «пропал доступ к старой админке», «не открывается ни по новой, ни по старой ссылке», "admin panel not opening from the hotel", "old admin panel gone"
<!-- evidence: FW-040, FW-050, FW-022 -->

### T-ADM-05 — Endless spinner or a page that never loads on the regional panel
**Symptom.** The regional panel shows an endless spinning wheel, or a page hangs while the user urgently needs to remove content.
**First checks.** Is this the first login on that region; how long ago was the account transferred; which panel (screenshot); does the other version of the panel work.
**Typical cause.** Account transfer between regions still in progress (5–10 minutes), or the user is on a panel of the wrong region.
**Owner.** Acme Support; R&D if the spinner persists after the transfer window.
**Fix or answer.** Wait 5–10 minutes and retry; then escalate the login to R&D. If the content change is urgent, ask which TV section it is and remove it ourselves.
**Also asked as.** «админка висит и не загружает страницу», «бесконечная загрузка», "endless spinning wheel", "NA panel will not load"
<!-- evidence: FW-076, FW-162 -->

### T-ADM-06 — Published changes do not appear on the TVs
**Symptom.** Publish was pressed, TVs rebooted (code 100, power), and hours later the TVs still show the old content or the new section is missing.
**First checks.** Menu Builder entry exists; item switched on; device type TV set; correct Display Group; publish done from the right regional panel; any cloud incident that day.
**Typical cause.** Section not added in Menu Builder; publish that silently failed during a cloud outage; a server-side content-loading fault.
**Owner.** Acme Support; R&D when republishing does not help.
**Fix or answer.** Add the menu item, save, republish, ask for a reboot. If we had to fix the loading script or publish manually, say so and confirm the TVs afterwards.
**Also asked as.** «контент не обновляется на ТВ», «изменения не появляются на экранах», "content not updating on TVs", "new section not showing after publish"
<!-- evidence: FW-182, FW-050, FW-145, FW-109 -->

### T-ADM-07 — Content shows in the app but not on the TV, or the reverse
**Symptom.** New photos or a menu are visible in the guest app but not on the TV; or a tile opens on the TV and throws an error in the app.
**First checks.** Device types on the item and its menu (TV / WEB / GUESTAPP); publish done; one TV force-refreshed with code 100.
**Typical cause.** Wrong device types on the content item; otherwise a content-update fault on the TV side.
**Owner.** Acme Support (device types); R&D (update mechanism).
**Fix or answer.** Add the missing device types, publish, ask the user to verify on both surfaces and to set device types on future items. If types are right and the TV still lags, escalate.
**Also asked as.** «изменения появились только в приложении, на ТВ нет», «плитка выдаёт ошибку в приложении», "photos updated in the app but not on TV", "tile throws an error in the guest app"
<!-- evidence: FW-160, FW-165 -->

### T-ADM-08 — Deleted content still shows on the TV
**Symptom.** An event, concert list or special offer was deleted (gone from the menu and the preview) but still shows on the welcome screen or in a TV section.
**First checks.** Was Publish pressed after deleting; correct regional panel; TV rebooted or code 100; cloud incident in the last days.
**Typical cause.** Publish did not go through (cloud incident, wrong panel) — the deletion itself is fine.
**Owner.** Acme Support.
**Fix or answer.** Republish (manually if needed), ask for a TV reboot, and confirm on the TV. If the panel was unreachable for the user, remove the item ourselves.
**Also asked as.** «удалённый раздел всё ещё показывается на ТВ», «убрать прошедшее мероприятие», "deleted section still on the TV", "remove a past event from the TV"
<!-- evidence: FW-050, FW-041, FW-162 -->

### T-ADM-09 — Image upload fails or the image looks wrong on the TV
**Symptom.** Error when saving after an image upload; or the uploaded photo appears discoloured, grey or distorted on the TV; or a cover image does not change.
**First checks.** Ask for the original file (not the error screenshot); format and size; where the image was uploaded (item vs section cover); which panel and region.
**Typical cause.** Unsupported or broken image file; wrong regional panel; cover images edited in the wrong place; a CMS cover-update bug.
**Owner.** Acme Support; R&D for the cover bug.
**Fix or answer.** Test the upload ourselves; re-upload originals; code 100 or reboot on one TV. Show where section covers are edited; if a cover still fails, upload it manually and escalate.
**Also asked as.** «ошибка при сохранении изображения», «картинка искажается на ТВ», "changes not saving, image upload error", "room photos not applied after publishing"
<!-- evidence: FW-076, FW-004, FW-067 -->

### T-ADM-10 — New account or second-property access does not work
**Symptom.** A new user cannot log in with the credentials sent; a colleague was given a second property but it does not appear; the user is missing from the staff list; "user already exists".
**First checks.** Screenshot of the error; SSO or option 1; did the user log out and back in after the property was added; spam folder for the reset mail.
**Typical cause.** No re-login after the property was added; SSO user not yet logged in (invisible in the staff list); account existing in another property of the group.
**Owner.** Acme Support (adds users, sets roles); the team for account review.
**Fix or answer.** Add the user to the property with the Administrator role, ask for a log-out/log-in, and if needed send a reset or new credentials privately. Explain property switching from the list at the top.
**Also asked as.** «завести учётную запись», «нет доступа ко второму отелю», "grant admin access for a colleague", "user already exists"
<!-- evidence: FW-137, FW-146, FW-224 -->

### T-ADM-11 — Function missing in the new panel, or the user needs the old one
**Symptom.** "Where are user profiles now?", "how do I set a price for a service?", "the new panel gives no image requirements", "one service became three".
**First checks.** Which function exactly; which panel the user is in; does the old panel open for them.
**Typical cause.** Migration split: users, notifications, statuses, reports are in the new panel; HSIA in the HSIA portal; HotSign in its CMS; a few functions still only in the old panel.
**Owner.** Acme Support; Product manager for missing functions.
**Fix or answer.** Name the panel that has the function and show the path with a screenshot from both panels where relevant. For a genuinely missing function, log it as a product request and keep the old panel as the working path.
**Also asked as.** «где теперь редактировать профили пользователей», «как попасть в admin v2», "where did user management go", "old panel needed for service pricing"
<!-- evidence: FW-040, FW-201, FW-221 -->

### T-ADM-12 — Templates section errors, or templates changed without permission
**Symptom.** The e-mail templates section opens with an error at every property using mailings; or check-in templates were changed and registration links point to the wrong site.
**First checks.** How many properties are affected; screenshot; for changed templates — who has access, last-saved time, is it a repeat.
**Typical cause.** Platform bug (templates section); unexplained edits by an account with access (security signal).
**Owner.** R&D (bug, E-008); security review (E-010) with Acme Support restoring the template.
**Fix or answer.** Bug: hand to R&D, report status on request, no release date. Changed templates: restore the correct links, audit access, report findings; a repeat is an incident.
**Also asked as.** «пропали шаблоны email-рассылок», «кто-то меняет шаблоны check-in», "email templates missing", "registration links point to the wrong page"
<!-- evidence: FW-029, FW-006 -->

### T-ADM-13 — "Where do I …" questions: reports, languages, text, hours, prices, files
**Symptom.** A how-to question: order statistics, disabling a language, editing a tab's text, menu working hours, service charge, uploading a PDF, hosting a video, welcome greeting.
**First checks.** Which property and which panel; what exactly should change; files attached.
**Typical cause.** Not a fault — self-service paths that users have not found, or content work that goes to the content managers.
**Owner.** Acme Support; Content managers for larger content jobs.
**Fix or answer.** Reports → Shop/Service Reports and Sales reports; languages and working-hours text are switched by support on request; text lives in the menu item (screenshots of both panels); service charge in the CMS + publish; PDFs/JPGs via the content menu; videos ≤ 3 GB under `video/…`; greeting rules in section 7.
**Also asked as.** «где посмотреть статистику по заказам», «в каком разделе редактируется текст», "where are the sales reports", "please disable a language", "add PDF menus"
<!-- evidence: FW-222, FW-210, FW-197, FW-225, FW-239 -->

### T-ADM-14 — Preview unavailable, content published anyway, TV looks broken
**Symptom.** The preview would not open, the user published regardless, and the TVs now display incorrectly; or a newly added channel never appeared after Publish.
**First checks.** Is it all TVs or some; 1800 photos (Device, Network, Authorization) from one room; when was Publish pressed; cloud incident that day.
**Typical cause.** A publish that failed or half-applied — often a short cloud outage; the content itself is usually fine.
**Owner.** Acme Support.
**Fix or answer.** Republish from our side, confirm on a TV, and answer the "did we do something wrong" question honestly: usually no — when preview fails, wait or ask us before publishing.
**Also asked as.** «предпросмотр не работает, опубликовали, ТВ показывает неправильно», «канал не появился после публикации», "preview unavailable and content broken on TV", "test channel not showing after publish"
<!-- evidence: FW-154, FW-109 -->
