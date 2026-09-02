<!-- meta
id: remote-access-and-connectivity
type: process
audience: support
tags: [vpn, openvpn, wireguard, anydesk, remote access, whitelist, firewall, server unreachable, tv server, mikrotik, static route, vlan, ping, telnet, network]
-->

# Remote Access and Connectivity

**Read this when:** you cannot reach a TV server or a gateway, a partner asks for VPN or AnyDesk access, a firewall or whitelisting question comes up, or "the server is unreachable" turns out to be the real cause behind another symptom.

---

## 1. What we can reach and what we cannot

Most connectivity tickets are decided by one question: which side of the boundary is the thing we need to touch. Everything on our side of the VPN and in the cloud we reach ourselves; everything else needs hands on site.

### Normally reachable from our side
The TV server, over our VPN: the on-prem server runs an OpenVPN client that dials our VPN endpoint, so we reach it on its internal address whenever the tunnel is up; cloud deployments need no tunnel. The MikroTik gateway: directly over the hotel's external address on the MikroTik management ports (Winbox and API), through the gateway's own WireGuard tunnel to our cloud, or over the VPN as a fallback when the direct path is filtered. The cloud side, always: admin panel/CMS, queues, HSIA portal, logs, the last-contact time of every TV. A working VPN to the server says nothing about the gateway — their address spaces never overlap — and the other way round.
<!-- evidence: FW-233, FW-007, FW-206, FW-082 -->

### Not reachable without help on site
The PMS server: only from the TV server, and only if the hotel routes it (static route, correct source VLAN); we ping and telnet the interface port from there and never log into the PMS itself. Hotel switches, controllers and access points: the contractor's — at most we see their DHCP requests or the clients on the gateway. Encoders: only when a laptop with AnyDesk is cabled to the encoder or into the TV VLAN. Partner and vendor systems (PMS clouds, OS Access, SMS providers): we see their responses in our logs, nothing more. When a ticket needs any of these, ask for an on-site person and a remote-desktop path at intake (Q-007 in [Ticket Intake Checklist](Ticket-Intake-Checklist)).
<!-- evidence: FW-228, FW-176, FW-017, FW-186 -->

## 2. VPN

Two tunnels matter: OpenVPN from the TV server to us, and WireGuard from each MikroTik gateway to us. They fail independently and are diagnosed separately.

### OpenVPN on the TV server: the three failure modes
(1) The ISP or the hotel firewall blocks the OpenVPN protocol or our VPN endpoint. "Nothing changed on our side" is the usual answer and usually wrong — providers change filters; ask hotel IT to check for blocks on our VPN domains and, if the router has a white (public) address, to set up a temporary port forward to the server while they fix the filter. (2) The tunnel service reports `active (exited)` with exit status 0, but no tunnel interface exists — the client started, could not reach the endpoint and gave up; restarting the service changes nothing, the path is the problem. (3) The server has no internet at all: the interface used as default gateway carries a private-range address with no route out, or the TV VLAN lost its uplink; in the CMS this shows as no recent contact and no checked-in guests.
<!-- evidence: FW-031, FW-250, FW-206 -->

### What else rides the VPN, and WireGuard on the gateways
The PMS data path: the TV server's PMS interface (FIAS) sends check-ins, check-outs and postings to our cloud over the same VPN. A dead tunnel is therefore never "just remote access" — Wi-Fi login by room number, the greeting on the TV and postings stop with it, and the CMS shows no in-house guests. Treat a VPN-down ticket on a property with a PMS interface as a [PMS Integration](PMS-Integration) outage as well. Gateways use WireGuard to our cloud for HSIA monitoring and management: when that tunnel is down the HSIA portal loses contact with the device while guests still have internet; a reboot of the gateway is the first remedy and the HSIA team owns the rest ([Guest Wi-Fi (HSIA)](Guest-Wi-Fi-HSIA)).
<!-- evidence: FW-206, FW-007, FW-233 -->

### Whitelisting: our endpoint families
When a hotel firewall filters outbound traffic, everything the TV server and the gateways talk to must be allowed: the admin panel, statistics, queue, HSIA, VPN endpoint, monitoring, analytics, debug and PMS-hub endpoints, our office networks and the WireGuard gateways. The current address list is sent to the hotel separately by the responsible team and is never pasted into a ticket or into this wiki. The PMS host and port must be reachable from the server as well. Requests in the other direction — the hotel's public addresses to be allowed on one of our services (for example the web preview service), or our source addresses that connect to the MikroTik management ports — also go to the responsible team; chase for confirmation and only then tell the partner it is done.
<!-- evidence: FW-250, FW-202, FW-233 -->

## 3. AnyDesk / remote desktop

AnyDesk is how we get into a network when the VPN is down: a machine inside the hotel network becomes our jump host.

### The procedure
Ask for a PC with AnyDesk in the same network as the server — or a laptop cabled into the TV VLAN, or cabled directly to the encoder for casting cases. Ask for the AnyDesk ID and the server's internal IP in that network (the ID may come in the ticket; any password comes through a private channel, never by e-mail). Agree a time and say who connects; the person must be at the PC to accept the request — sessions "that never happened" are almost always requests nobody accepted, so ask them to watch the screen at the agreed time and to tell us when they step away. Say when we are finished and whether we will reconnect. Note findings in the ticket without addresses or credentials. If the partner insists on a video call instead of AnyDesk, agree — but we still need a machine inside the network.
<!-- evidence: FW-031, FW-009, FW-017, FW-250 -->

### What to prepare before the session
Know what you will check so the on-site person is not kept waiting: on the server, the tunnel service state and interface list, the default route and DNS, a ping to the VPN endpoint, a ping and telnet to the PMS host and port; from a laptop in the TV VLAN, the address it receives, the server page in a browser and a ping to the TV-network gateway; at an encoder, its web page and the HDMI inputs. Have the expected values ready from our documentation for the property. If the first session ends without a conclusion, say what the next step is and who owns it instead of leaving the ticket Pending.
<!-- evidence: FW-236, FW-176, FW-017 -->

## 4. Access requests

Access requests are routine but they are also where the security norms bite: we hand out access, never credentials in the clear.

### Partner VPN access, server accounts, credentials
A partner asking for VPN access to a property's content site (the CMS or WebApp on the server's internal address) gets it added in the VPN tool; ask them to log in again and confirm. Server accounts for hotel IT are per site and per person; we never e-mail logins or passwords, even when the requester says the old ones "no longer work" — hand them over through the agreed private channel. Requests to share credentials with a third party, or to keep an open path permanently, are security signals (E-010 in [Escalate or Answer](Escalate-or-Answer)).
<!-- evidence: FW-136, FW-031 -->

## 5. Diagnosing "server unreachable"

Work outside-in: what the cloud sees, what a laptop in the hotel sees, what the server itself sees. Each layer rules out the next.

### From the cloud
Open the admin panel: the last-contact time of the TVs tells you whether the server (and its cloud link) has been silent for hours or only some rooms have. TVs shown online and content served over VPN mean the server is fine and the fault is in the hotel network. A CMS with no checked-in guests points at the PMS path or a dead VPN. If we cannot reach the server at all, ask the hotel to check its power, state and internet connection before anything else, and request AnyDesk if they say it is up.
<!-- evidence: FW-236, FW-082, FW-206, FW-009 -->

### From a laptop on site, and from the server
On site: the laptop should get an IP from the TV range, open the server's address in a browser and ping the TV-network gateway; an address received but no web page and no ping while some TVs work means a block on the network or on specific ports, not a dead server. From the server: ping and telnet the PMS host and interface port (FIAS uses 5090); "Destination Host Unreachable" or "No route to host" means the PMS is off or the network changed — hotel IT; an i/o timeout on the port with the host up points at the source VLAN or static route the hotel expects us to use.
<!-- evidence: FW-236, FW-120, FW-176, FW-228 -->

### Not actually down: updates, power events, long boots
A short "interface disconnected" right after routine system updates: on servers with Keepalived failover, the network re-initialisation during an unattended upgrade once made the node switch to backup and stop the service gracefully; the failover scripts were adjusted so maintenance no longer does this — explain it and confirm the updates finished. A server that will not boot after a power failure: reboot; if it stops in BusyBox/initramfs, follow the recovery instruction; if that fails the disk is probably gone and needs replacement plus reinstallation. TVs that take minutes to load are not a dead server: they wait on something unreachable (external addresses blocked by the hotel or ISP, mixed DHCP scopes). The hotel's external address answering on the web port is usually a port forward to the TV server, not proof the LAN path works.
<!-- evidence: FW-070, FW-087, FW-120, FW-082 -->

## 6. Network prerequisites for a TV server

These are the things we ask hotel IT to guarantee at installation and re-check after any network change; most "server unreachable" tickets are one of them broken.

### Interfaces, DHCP and outbound reachability
A TV server needs: a management/internet interface with a default route out (this carries the VPN and the cloud traffic); the TV VLAN, where the TVs get their addresses — commonly from DHCP served by the server itself, and that scope must contain only TVs (DHCP requests from access points and switches mean the networks are mixed and boots get slow); reachability from the guest Wi-Fi network, where guests open the WebApp on the server's internal address; and a route to the PMS host from the source address the hotel expects. Outbound, none of the endpoint families in §2 may be filtered, and the external addresses TVs call must not be blocked by the ISP. When a hotel asks what to open, send the list through the responsible team and confirm the PMS host and port with them.
<!-- evidence: FW-120, FW-206, FW-176, FW-250 -->

### Blocked external addresses and the TV-to-cloud path
TVs and the server talk to our cloud directly (queue, statistics, notifications); when the ISP or a hotel filter blocks some of those destinations, TVs boot slowly, Inspect tasks and orders never reach the cloud and the integration logs show no request at all. The 1800 diagnostic page → Network on the TV shows whether the cloud is reachable from that TV; ask for a photo before blaming the server. Cases where the TV app waited on an address blocked upstream have been handled by R&D removing the call — report them with the photo and the boot time.
<!-- evidence: FW-120, FW-236 -->

## 7. Triage rows

### T-NET-01 — Server unreachable from our side
**Symptom.** We cannot open the server over VPN; the partner reports missing check-ins, black TVs or "interface disconnected"; the CMS shows no recent contact. All TVs down is a whole-property outage (E-006).
**First checks.** Last-contact time of the TVs in the admin panel; the CMS Guest list; can the hotel see the server powered and with internet; did the ISP, firewall or public address change; is a PC with AnyDesk available in the server's network.
**Typical cause.** OpenVPN blocked by the ISP or firewall; server without internet; server powered off or crashed; whole-property network fault.
**Owner.** Acme Support to diagnose over AnyDesk; hotel IT / ISP for the block or the hardware.
**Fix or answer.** Ask for a state and internet check, then AnyDesk; from the server test the VPN endpoint and default route; ask hotel IT to unblock our VPN domains or set a temporary port forward.
**Also asked as.** «сервер недоступен», «нет доступа к серверу по VPN», "server unreachable", "we cannot reach the server over VPN"
<!-- evidence: FW-009, FW-031, FW-206, FW-236 -->

### T-NET-02 — VPN service is running but there is no tunnel
**Symptom.** Hotel IT reports the OpenVPN service as `active (exited)`, exit status 0, and only the LAN interface in the interface list; restarting the service changes nothing.
**First checks.** Can the server reach our VPN endpoint at all (blocked protocol or host); any firewall change; does the server have a default route and DNS; is the config file the one we issued.
**Typical cause.** Outbound OpenVPN filtered by the hotel firewall or the ISP; changed public-address rules.
**Owner.** Hotel IT for the firewall; Acme Support for the config check and the whitelisting list.
**Fix or answer.** Send the endpoint families to whitelist (through the responsible team), have IT allow the VPN endpoint and the PMS host and port, then restart the service and check that the tunnel interface appears. The PMS interface recovers with the tunnel.
**Also asked as.** «VPN активен, но туннеля нет», «служба openvpn запущена, интерфейса tun нет», "VPN active (exited) with no tunnel interface", "VPN tunnel not coming up"
<!-- evidence: FW-250, FW-206, FW-031 -->

### T-NET-03 — WireGuard from the gateway to the cloud is down
**Symptom.** The HSIA portal or a partner's monitoring lost the gateway while guests still have internet; a request to "check the WireGuard connection on the device".
**First checks.** Portal Monitoring and Cluster for the gateway; can we reach it over the hotel's external address on the management ports; can someone on site reboot it.
**Typical cause.** Gateway hung or its tunnel stalled; a hotel firewall change on the external address.
**Owner.** HSIA team; the hotel for the reboot.
**Fix or answer.** Reboot the gateway first; then the HSIA team checks the tunnel. Do not report "VPN works" because the TV server answers — that path is unrelated to the gateway.
**Also asked as.** «нет wireguard-подключения от шлюза в облако», «нет доступа к MikroTik по VPN», "WireGuard tunnel from the gateway is down", "no VPN access to the hotel gateway"
<!-- evidence: FW-007, FW-233 -->

### T-NET-04 — TVs cannot see the server although it is fine over VPN
**Symptom.** Black screens or "no connection" in some or all rooms; the server is reachable over VPN and serves content; TVs receive IP addresses.
**First checks.** Which IP the TV received (from the TV range?); a laptop test from a room: address, browser to the server, ping; DHCP requests from non-TV devices in the TV scope; port-level blocks on the access switches; boot time of an affected TV.
**Typical cause.** A network block between rooms and server (VLAN, ACL, ports); mixed networks; broadcast flood; external addresses blocked so TVs stall on boot.
**Owner.** Hotel IT / contractor; R&D only when the TV app is waiting on a blocked external call.
**Fix or answer.** Report what the laptop test shows and hand the network to the hotel; a server reboot helps only when the server itself misbehaves. Ask for 1800 → Network photos from an affected TV.
**Also asked as.** «телевизоры не видят сервер», «чёрный экран, сервер по VPN доступен», "TVs cannot reach the server", "black screen in rooms but the server is online"
<!-- evidence: FW-236, FW-082, FW-120 -->

### T-NET-05 — PMS host unreachable from the TV server
**Symptom.** The interface does not start or its logs stop; fias_connecter reports an i/o timeout on the interface port; no reservations since a given date.
**First checks.** From the server: ping the PMS host, telnet the port (FIAS 5090); the static route and the source address the hotel expects; whether the PMS moved or was powered off; errors of the CSV fallback if one is configured.
**Typical cause.** PMS off or moved; a network change; wrong source VLAN or static route on the server.
**Owner.** Hotel IT for the PMS and the route; Acme Support for the server-side route change.
**Fix or answer.** Send the ping and telnet output to the hotel; correct the route or VLAN on the server once the hotel tells us the expected source; re-test and confirm data flows in the log. See [PMS Integration](PMS-Integration).
**Also asked as.** «нет связи с PMS-сервером», «интерфейс не стартует, i/o timeout», "PMS host unreachable from the server", "no data received from the PMS"
<!-- evidence: FW-176, FW-228 -->

### T-NET-06 — Interface shows disconnected for a short time after updates
**Symptom.** The platform shows the property's interface as disconnected; guests complain; it recovers by itself or after our intervention.
**First checks.** Unattended-upgrade history on the server; Keepalived state on servers with failover; whether the service is running now.
**Typical cause.** Network service re-initialisation during automatic OS updates made Keepalived treat the node as backup and stop the service; the failover scripts have since been adjusted.
**Owner.** Acme Support / R&D.
**Fix or answer.** Confirm the updates finished and the service runs; explain the mechanism; check that the failover scripts carry the adjustment. Log a recurrence in [Known Issues and Release Notes](Known-Issues-and-Release-Notes); at several properties it is E-008.
**Also asked as.** «интерфейс показывает disconnected», «кратковременный обрыв интерфейса после обновлений», "interface shows disconnected", "short outage after system updates"
<!-- evidence: FW-070 -->

### T-NET-07 — Server does not boot after a power failure
**Symptom.** All TVs show no connection; the server was found off or throws errors on boot; the hotel asks "is this normal".
**First checks.** Power supply and power state; console output (a BusyBox/initramfs prompt?); whether the system reaches the login prompt.
**Typical cause.** A failed power supply and file-system damage from the abrupt stop; in the worst case a dead disk.
**Owner.** The hotel for hardware; Acme Support for the recovery instruction; deployment team for a reinstallation.
**Fix or answer.** Reboot; if it stops in BusyBox/initramfs, follow our recovery instruction; a system that reaches the login prompt needs nothing more from the hotel — we verify the services remotely. If recovery fails, replace the disk and reinstall. Whole-property outage handling applies (E-006).
**Also asked as.** «сервер не загружается после отключения питания», «сервер выдаёт ошибки при загрузке», "server does not boot after a power failure", "server stuck in initramfs"
<!-- evidence: FW-087 -->

### T-NET-08 — Third-party portal unreachable (OS Access), hosts-file workaround
**Symptom.** The OS Access web interface stops opening, login fails, page reloads throw errors; the site works over a VPN from another country.
**First checks.** Is it a vendor-side outage (other customers, vendor status); does the customer's PC carry hosts-file entries from an earlier bypass; can that PC use a VPN.
**Typical cause.** Outage or access restriction on the vendor's servers; stale hosts-file entries interacting with it.
**Owner.** Third party (the access-control vendor); Acme Support relays status.
**Fix or answer.** Say it is vendor-side and that we are waiting for them; the only workarounds are commenting out the hosts entries and using a VPN — both may be impossible on a locked-down PC, in which case they wait. Update the ticket when the vendor recovers. See [Door Locks and Mobile Keys](Door-Locks-and-Mobile-Keys).
**Also asked as.** «не открывается OS Access», «ошибка при авторизации в OS Access», "OS Access portal unreachable", "vendor site down"
<!-- evidence: FW-186 -->
