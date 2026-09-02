<!-- meta
id: tv-channels-and-video-streaming
type: product
audience: support
tags: [tv channels, iptv, multicast, udp, hls, vlc, channel list, headend, streamer, streameradmin, welcome video, info channel, encoder, promo playlist]
-->

# TV Channels and Video Streaming

**Read this when:** a ticket says channels are missing, lagging, silent or wrong, or a welcome, promo or info video is black — and you must decide whether it is ours, the channel provider's or the hotel network's.

---

## 1. How channels reach the TV

A channel, for us, is a name, a logo and a stream address in the channel list. Everything that happens to the stream before that address belongs to someone else.

### From headend to TV app
The headend (channel provider) receives the channels and re-streams each one onto the hotel's TV network as multicast UDP — or, where the TV app is current enough, as HLS. The addresses in our channel list are usually the headend's internal restream addresses, one per channel, not the provider's public feeds; a partner who sees a "different" address from what the provider quoted is looking at the restream, which is fine as long as it plays. Casting takes the same path through an encoder: a Chromecast in the rack feeds the encoder over HDMI and comes out as a multicast stream. The Acme TV app does nothing but tune the TV to the address mapped to the channel the guest picked — it does not decode, transcode, buffer or repair the stream, and it cannot lower a stream's bitrate. The TV server carries the channel list (chanadmin) and runs the streamer for the streams we produce ourselves: the welcome video, the info channel and promo/video channels.
<!-- evidence: FW-061, FW-229, FW-017, FW-164 -->

### What we can and cannot do with a stream
We can: change which address a channel points to, add or remove channels, restart our streamer, upload and convert video files, and update the TV app so it supports new stream types (HLS). We cannot: fix a stream that is bad at its source, force a lower bitrate for old TVs (the provider may be able to), or make a channel play that the provider does not deliver into the TV VLAN. When a partner asks us to "check the broadcast addresses", the honest check is the VLC test in section 3 — from our side the streams usually look fine because we are not in their path.
<!-- evidence: FW-061, FW-229 -->

## 2. Ownership boundary

### Partial outage = provider or hotel network; whole list = check us first
If only part of the channel list is affected — a language package, a handful of channels, quality on some channels, stutter or audio loss on specific channels — the cause sits with the channel provider (headend) or the hotel network (multicast routing, switch load); we do not process those streams. Say that plainly, ask the partner to involve the provider's engineer and the local network engineers, and help with the VLC test. If no channel plays on any TV, or the whole list behaves the same way, start on our side: is the TV app starting at all, is the server up, has the channel list or the streamer changed, did a cloud incident swallow a publish. "The TV channels section shows the Chromecast screen on nearly all TVs" is ours. Whole-property loss of TV is E-006 in [Escalate or Answer](Escalate-or-Answer).
<!-- evidence: FW-229, FW-061, FW-032, FW-173 -->

## 3. VLC test procedure

### VLC test from the TV VLAN
The one test that separates "stream" from "TV": take a laptop into the TV network — ideally on the same cable as a failing TV — open VLC, Media → Open Network Stream (Ctrl+N), paste the channel's UDP or HLS address from our channel list, play it and listen to the audio. Stream plays with sound on the laptop but not on the TV → the TV or its firmware is the limit (old LG LY sets, for example). Stream does not play on the laptop either → it is not arriving in that VLAN: provider or network for headend channels, our streamer for the welcome, info and promo streams (restart it first). Ask for the result per address, not "we checked it". The same test proves that a non-Acme TV in a public area can receive IPTV before anyone installs anything on it.
<!-- evidence: FW-061, FW-144, FW-164 -->

## 4. Channel list management

### Where the list lives: Application → TV channels
The channel list is edited in the admin panel under Application → TV channels: name, logo and stream address per channel, assigned to the channel groups (Display Groups) that should see it. Partners can edit it themselves; support does it on request. Every change needs Publish, and the TV picks it up on its next refresh — code 100 or a power cycle forces it. Keep the list loaded in the system in sync with the headend's list: mismatched logos, a channel that plays under another channel's name, and duplicate entries (one broadcasting, one black) come from editing one list and not the other.
<!-- evidence: FW-086, FW-109 -->

### Adding a channel or fixing a wrong one
To add a channel, get the exact stream address from the provider (a headend often has separate addresses for feeds of the same brand in different languages), add it to the list and to every channel group that should carry it, publish, reboot a TV and check. A list mistake — two rooms showing different channels under the same entry — survives until the entry is corrected and the TVs refresh; if it persists after publishing, ask for the current multicast list from the provider, compare it with what is loaded, correct the addresses and reboot the affected TVs. A publish that never landed during a cloud incident has to be repeated afterwards.
<!-- evidence: FW-061, FW-086, FW-109 -->

### Public-area and non-Acme TVs
On hotel-series sets IPTV is available only through the Acme TV app — there is no other way to tune them. For a public-area TV that should show channels only: install the app by the standard instruction, register it, create a Display Group for it and give it a one-page menu with the channels. Avoid one-off custom menus outside Display Groups; content managers advise against them because they cause errors later. Registration, licences and Display Groups are in [Acme TV](Acme-TV).
<!-- evidence: FW-144 -->

## 5. Streamer and streameradmin

### What the streamer does and when to restart it
The streamer is a service on the TV server that produces our own multicast streams: the welcome video, the info channel and promo/video channels built from uploaded files. It is the first thing to restart when the welcome video is black on all TVs, the info channel is down (typically after the server lost its internet link or was rebooted) or a promo playlist stops — after the restart we should see multicast traffic again, and the customer should also flick through a few channels to confirm nothing else moved. The current streamer version restarts a failed stream automatically; older versions need the manual restart, so a property that asks for it repeatedly gets the service updated.
<!-- evidence: FW-164, FW-183, FW-246 -->

### streameradmin: uploading and converting a video
streameradmin is the streamer's web UI on the TV server, reachable from the hotel network with the credentials issued to the property, or over VPN (the hotel's or ours); a partner without access asks us or the deployment engineer to upload. Steps: Streams → +video → upload the file with "Convert video to Acme supported format" → copy the resulting file name with its .mp4 extension → reference it as `video/FILE.mp4` in the admin panel (welcome page, or a video page in a content section). Limits: ≤ 3 GB, 720p mp4 recommended — the converter outputs 1280x720; files live under `video/` on the server. Send the partner the resulting path when they asked for "the link".
<!-- evidence: FW-244, FW-247 -->

### Welcome video, video channel 1 and looping playlists
The welcome page plays one video file once; it has no sound unless the file carries an audio track and it does not loop by itself. For a loop, a video channel (channel 1, managed in streameradmin) can be set as the welcome — possible, but not recommended because the broadcast can be unstable. Several promo clips can be combined into one video channel that plays them one after another in a loop; adding or removing a clip is a support change, followed by a streamer restart and a power cycle of one TV to verify (the others catch up as their cache refreshes, including the channel name). A clip that ends on black frames shows black at the end — ask for a trimmed file; we do not edit video, we upload what we receive.
<!-- evidence: FW-244, FW-246, FW-215, FW-216 -->

## 6. HLS

### HLS support and the update it needs
Some providers deliver HLS instead of multicast. The TV app plays HLS only from a current version, so an HLS channel on an old build simply does not start. Plan the app update first: the update itself is ≤ 30 minutes, verification longer. Two ways: update all TVs at once with someone on site to check right away (about 30 minutes of their time), or the test folder — the new version in a separate folder on the server, one TV pointed at its internal test address, a full functional check, then the main folder. Large properties tend to choose the all-at-once route; either way the window is agreed with the hotel. See [Updates, Maintenance and Change Control](Updates-Maintenance-and-Change-Control).
<!-- evidence: FW-066 -->

## 7. Old hardware limits

### LG LY-series lag and buffering
LG LY sets (for example 42LY750H, 10+ years old) stutter and lose audio on some high-bitrate channels while newer US sets (for example 43US662H) on the same stream, and a laptop in the same VLAN, play it cleanly — the old sets run out of buffering memory. Firmware 3.32 for the 42LY750H is on our file server (or LG's site) and is worth one test TV, but in the field it did not help; the honest answer is a hardware limit and a fleet replacement plan. We cannot lower the bitrate on our side; the provider may be able to. Keep such tickets open as On Hold with that conclusion stated rather than closing on the customer.
<!-- evidence: FW-061 -->

## 8. Triage rows

Each row is self-contained. Standard evidence: 1800 photos (Network, Authorization), a video of the symptom, an example room, the VLC result per address.

### T-CH-01 — No channels on any TV
**Symptom.** The platform home screen shows but the TV application does not start, so no channel plays anywhere; or every channel is black on every TV.
**First checks.** Does the app start at all (if not, see T-TV-01/T-TV-02 in [Acme TV](Acme-TV))? 1800 → Network and Authorization photos, a video, an example room; 1169 logs after a power cycle; VLC on one address from the TV VLAN; whose DHCP; licence count (to rule it out, not because it is likely).
**Typical cause.** A network problem between the TVs and the server or headend (DHCP, VLAN); a headend outage takes the whole list down at once.
**Owner.** Hotel IT / channel provider for the network and streams; Acme Support for the server and the list.
**Fix or answer.** Whole-property loss is E-006: respond immediately, collect the standard evidence, run the VLC test to split network from server, and say clearly what we checked on our side.
**Also asked as.** «не работают все каналы», «ни один канал не показывает», «вся ТВ-система не работает», "no channels on any TV", "TV application does not start"
<!-- evidence: FW-032, FW-087 -->

### T-CH-02 — Some channels lag, stutter or lose sound
**Symptom.** A few channels freeze, buffer or drop audio; other channels are fine; often only on older TVs.
**First checks.** Which channels and which TV models; VLC test of those addresses from the TV VLAN, with audio; the same channel on a newer set.
**Typical cause.** High-bitrate streams on old LG LY sets (hardware buffering), or stream quality at the headend or on the network.
**Owner.** Channel provider / hotel network for the stream; hotel for TV firmware or replacement; Acme Support does not process streams.
**Fix or answer.** If VLC and newer TVs play it cleanly, it is the TV: try the model's firmware on one set, then recommend replacement. We cannot reduce stream quality — the provider may be able to.
**Also asked as.** «каналы лагают», «подтормаживания и потеря звука на каналах», "channels buffering", "video lags on some channels"
<!-- evidence: FW-061 -->

### T-CH-03 — Audio drops out on LG set-top boxes
**Symptom.** TV channels intermittently lose sound on LG boxes; a power cycle or re-plugging the Ethernet cable restores it.
**First checks.** Box model and firmware; which channels; does the stream keep its audio in VLC; do other device types on the same streams keep sound?
**Typical cause.** Player-side behaviour on the LG box — no instant fix; an R&D case.
**Owner.** R&D (debug session with the partner).
**Fix or answer.** Forward to R&D, offer a debug session, keep the ticket On Hold with the workaround (power cycle) stated; no ETA promised.
**Also asked as.** «пропадает звук на приставках LG», «периодически теряется звук на каналах», "LG boxes lose audio"
<!-- evidence: FW-028 -->

### T-CH-04 — One channel wrong or missing after a list edit
**Symptom.** After the list was changed, some rooms show one channel and others another under the same name; a channel is missing on a few TVs though it updated elsewhere; a new test channel does not appear after publishing.
**First checks.** Publish done, and was there a cloud incident at the time? 1800 → Network/Authorization on a failing TV; the current multicast list from the provider versus what is loaded.
**Typical cause.** Wrong or duplicated addresses in the list; TVs that did not refresh; a publish lost during a cloud incident.
**Owner.** Acme Support (or the partner, in Application → TV channels).
**Fix or answer.** Correct the addresses to the provider's list, re-run the content update, publish, reboot the affected TVs; show the partner where to fix it themselves next time.
**Also asked as.** «показывает не тот канал», «каналы не обновились на части ТВ», «новый канал не появляется после публикации», "wrong channel in some rooms"
<!-- evidence: FW-086, FW-109 -->

### T-CH-05 — A language package (for example the Russian channels) is down
**Symptom.** None of the channels of one language or package play; everything else works.
**First checks.** Confirm it is a subset of the list; VLC on one of the affected addresses from the TV VLAN.
**Typical cause.** The provider's package is off, or the network path for those multicast groups.
**Owner.** Channel provider / hotel network.
**Fix or answer.** The system does not process the streams, it only tunes the TV to them; the hotel or partner raises it with the provider and the local network engineers, and we help interpret the VLC result.
**Also asked as.** «не работают русскоязычные каналы», «пропал пакет каналов», "Russian channels not working"
<!-- evidence: FW-229 -->

### T-CH-06 — Info channel black
**Symptom.** The info channel shows nothing, its address does not play in VLC either; often after the TV server lost internet or was rebooted.
**First checks.** Is it only the info channel and our other streams? Does the address play in VLC? Streamer state on the server.
**Typical cause.** The streamer stopped or lost its stream after the connectivity event.
**Owner.** Acme Support.
**Fix or answer.** Restart the streamer, confirm multicast traffic is visible, ask the customer to check; update the streamer version if it keeps recurring.
**Also asked as.** «инфоканал не работает», «информационный канал чёрный», "info channel down"
<!-- evidence: FW-164 -->

### T-CH-07 — Welcome or promo video black screen
**Symptom.** The welcome video does not play on all TVs while the rest of the system works; a promo channel shows black; a newly uploaded welcome video "does not play"; a black screen at the end of the clip.
**First checks.** All TVs or one? Was a video just uploaded or changed? Has about 20 minutes passed; power-cycle one TV; does the clip itself end on black frames?
**Typical cause.** Streamer stopped (all TVs), TV cache not refreshed (one TV), a clip with black frames at the end, or an old streamer version that does not restart failed streams.
**Owner.** Acme Support.
**Fix or answer.** Restart the streamer; power-cycle a TV and connect to it to check playback; ask for a trimmed clip and re-upload; update the streamer to the auto-restart version if it recurs.
**Also asked as.** «не воспроизводится приветственный ролик», «чёрный экран вместо видео», "welcome video does not play", "promo playlist black screen"
<!-- evidence: FW-183, FW-246, FW-215, FW-216, FW-214 -->

### T-CH-08 — Channels show the Chromecast screen instead of the broadcast
**Symptom.** In the TV channels section, nearly all TVs show the casting/Chromecast screen instead of the live stream.
**First checks.** Scope (nearly all TVs means it is not a room problem); which channels; was the channel list or the casting service changed recently?
**Typical cause.** On our side — a server-side stream or channel-mapping fault; nearly all TVs at once rules out a room problem.
**Owner.** Acme Support.
**Fix or answer.** Support fixes it on the server and asks the customer to re-check after a TV reboot; ask for the exact channels and a photo if it recurs. Casting itself is covered in [Casting, Chromecast and AirPlay](Casting-Chromecast-and-AirPlay).
**Also asked as.** «вместо канала показывает экран Chromecast», "TV channels show Chromecast screen"
<!-- evidence: FW-173 -->

### T-CH-09 — HLS channels do not play on old app versions
**Symptom.** Channels delivered as HLS never start while multicast channels work; or a provider migration to HLS is planned and the partner asks how long the update takes.
**First checks.** App version (1800 → Device); which channels are HLS.
**Typical cause.** The TV app is older than HLS support.
**Owner.** Acme Support (update) within a window agreed with the partner.
**Fix or answer.** Update the app (≤ 30 minutes; test folder, or all at once with someone on site), then map the HLS addresses and publish.
**Also asked as.** «нужно обновить Acme Hotels Inc. для поддержки HLS», «сколько займёт обновление», "HLS channels not playing"
<!-- evidence: FW-066 -->

### T-CH-10 — Channel logos mismatched or duplicated
**Symptom.** A channel plays under another channel's logo; a channel appears twice — one entry plays, the other is black; one channel from the provider's list is missing.
**First checks.** The list loaded in the system versus the headend's list; which entries carry multicast addresses at all.
**Typical cause.** The two lists were edited independently.
**Owner.** Partner or hotel in Application → TV channels; Acme Support on request.
**Fix or answer.** Send the loaded list, have the partner mark the mismatches, fix names, logos and addresses, remove the dead duplicate, publish, reboot a TV.
**Also asked as.** «логотипы каналов не совпадают», «канал с двумя логотипами», "channel logos mismatched"
<!-- evidence: FW-086 -->
