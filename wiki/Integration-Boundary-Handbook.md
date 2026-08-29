<!-- meta
id: fsg-integration
type: process
audience: triage
tags: [integration, third-party, ownership, whitelist, webhook, licence, boundary]
-->

# Integration Boundary Handbook

**Owner:** Facility Support Group — Integrations
**Applies to:** every ticket involving a system Aperture does not own
**Companion page:** [Facility-Down Incident Runbook](Facility-Down-Incident-Runbook)

---

## 1. Why this page exists

The Aperture Enrichment Platform is not a closed system. It sits in the middle of a
mesh of systems owned by other people: the operator's records system, the kitchen's
requisition terminals, the lock vendor's credentialing service, third-party
entertainment licensors, and the facility's own network equipment.

Consequently a large share of our tickets are not about our software at all. They are
about a seam. The engineering content of these tickets is usually small; the difficulty
is entirely in determining whose seam it is, and then saying so without the operator
concluding that we are refusing to help.

This page is about doing that well. Getting it wrong in the unhelpful direction — "not
our system, please contact your vendor" — is the fastest route to a commercial-risk
escalation.

---

## 2. The boundary principle

> Aperture owns the platform, the data we send, and the moment we send it.
> The operator owns their network, their equipment, and their third-party contracts.
> A third party owns their endpoint and its behaviour.

The word doing the work is **moment**. If we transmitted correct data to a correct
endpoint and it was accepted, our obligation is discharged even if the outcome at the
far end is wrong. If we transmitted late, malformed, or not at all, it is ours no matter
how odd the far end's behaviour is.

FSG's job in a boundary ticket is to establish which of those two sentences applies, with
evidence, and to say so in a way that lets the operator take it forward.

---

## 3. Systems at the boundary

| System | Typically owned by | Aperture's side of the seam |
|---|---|---|
| Subject Intake & Disposition (SIDS) | Third-party vendor, operator-contracted | We consume arrival, chamber-assignment, and departure events |
| Nutrient Requisition Terminals (NRT) | Operator, vendor-supplied | We submit requisitions and item metadata |
| Aperture Control / lock credentialing | Third-party vendor | We trigger credential issuance; the vendor encodes |
| Entertainment licensors | Licensor, contracted per facility | We host the application shell; they gate the content |
| Facility edge network | Operator | Nothing. We consume it. |
| Chamber display hardware | Operator, Aperture-specified | Firmware compatibility only |

Note the asymmetry in row 1: the operator contracts SIDS, but FSG is expected to
diagnose it. This is unreasonable and is nonetheless the deal. Learn the two or three
records systems that dominate our estate well enough to read their error responses.

---

## 4. Determination flow

Run this before writing a single word about ownership.

1. **Did we send?** Find the outbound attempt in our logs. Record the timestamp.
2. **Was it well-formed?** Compare against the integration contract for that endpoint.
3. **What came back?** Capture the verbatim response, including status code and any
   error body. Verbatim — paraphrased vendor errors have sent us down wrong branches
   more than once.
4. **Is the failure consistent or intermittent?** Consistent failure points at
   configuration; intermittent points at network, capacity, or rate limiting.
5. **Does it fail for every facility or one?** One facility with an estate-wide-healthy
   integration is a configuration or authorisation fault at that facility.

Only after all five do you have a defensible statement of ownership. Steps 1 and 3 alone
resolve most of these tickets.

---

## 5. Authorisation failures

The most common third-party rejection in our estate is an authorisation refusal from a
records system: an HTTP **403** with an error body indicating the calling tenant is not
permitted from the originating address — typically surfacing as a
`DomainException` / `NotWhitelisted` pair.

[FW-238](https://github.com/podlodka-ai-club/flywheel/issues/238) is the canonical
example. Updated reservation data stopped reaching Subject Network Access, so chamber
moves and stay extensions silently stopped propagating and subjects who moved chambers
could no longer authenticate. Nothing in our platform was broken; our address was simply
no longer on the far side's allowlist.

This class of fault is **invisible until a subject is affected**. The integration does
not alert, it just returns 403 to every call. Two consequences:

- Treat any unexplained staleness in subject data as a possible authorisation failure,
  even when nothing is reported as broken.
- When our egress addresses change, the allowlist update is a coordinated project, not a
  ticket. It requires lead time with every affected third party.

### Requesting an allowlist update

When an operator or vendor asks for our address list — a recurring request, see
[FW-202](https://github.com/podlodka-ai-club/flywheel/issues/202) and
[FW-220](https://github.com/podlodka-ai-club/flywheel/issues/220):

1. Send the current published list only. Never send an address you have observed in a
   log; observed egress and published egress are not the same set.
2. State which services use it, so the recipient can scope their rule.
3. Give the change-notice period we commit to.
4. Record in the ticket which third party now holds the list, so we can notify them when
   it changes. This register is the only reason we are able to change egress at all.

---

## 6. Event delivery and webhook health

Records-system integrations deliver events to us by webhook. When that subscription
drops, subject data goes stale and authentication fails silently.

[FW-193](https://github.com/podlodka-ai-club/flywheel/issues/193) is the pattern worth
recognising: a subscription that deactivated three times in a single day. Each time the
operator re-enabled it, it deactivated again. Subjects could not authenticate to the
network by surname and chamber number while it was down.

Repeated auto-deactivation is almost never the far side being capricious. It is a
protective mechanism responding to something we are doing: our endpoint returning errors,
or timing out, or acknowledging too slowly under load. When our own processing is delayed
— which for cloud-side congestion it periodically is — the far side sees timeouts and
withdraws the subscription exactly as designed.

So: before asking an operator to re-enable a subscription for the fourth time, check our
own acknowledgement latency over the failing window. Re-enabling into an unhealthy
endpoint produces a fourth deactivation and a materially less patient operator.

---

## 7. Licensing at the boundary

Licence counts are held in our commercial records, provisioned into the platform, and
visible to operators in their portal. Those three can disagree, and when they do the
operator sees a purchase they have made and an entitlement they do not have.

**Display licences and Subject Device Mirroring licences are separate pools.** They are
purchased separately, counted separately, and exhaust separately.
[FW-204](https://github.com/podlodka-ai-club/flywheel/issues/204) turned on precisely
this: additional chamber and mirroring licences were purchased and the commercial process
completed, the increase appeared in the portal, and the mirroring count did not move. The
first two support replies quoted a count of 447 without stating which pool it referred
to, which cost the exchange several days.

Always name the pool. "447 active display licences" is a useful sentence; "447 licences"
is not.

Provisioning after a commercial change is a manual step. If the portal shows an increase
and the platform does not, the fault is ours and the correct action is to apply it, not
to refer the operator back to their account manager.

---

## 8. Requisition delivery to the kitchen

Requisitions placed at a Chamber Morale Display are submitted to the facility's
requisition terminals. Two recurring failures:

**Submission timeouts.** A terminal that accepts the connection and then does not respond
produces a timeout at our side — in
[FW-227](https://github.com/podlodka-ai-club/flywheel/issues/227), a 30-second limit
expiring with no bytes received. This is a far-side capacity or availability problem.
Our side is behaving correctly. Say so, and give the operator the timestamps so their
vendor can find the corresponding inbound attempts, which is the only thing that will
actually move the ticket forward.

**Item catalogue divergence.** Items added at the terminal do not appear for subjects
until the catalogue is synchronised. Operators reasonably assume adding an item is
sufficient and are then unable to find it. Confirm whether synchronisation is scheduled
or manual for that facility before suggesting anything else.

**Field content.** Requisition payloads carry chamber number and subject notes. Truncation
of the notes field is not cosmetic. Subjects record dietary restrictions there, and a
truncated note means the kitchen sees part of a restriction —
[FW-248](https://github.com/podlodka-ai-club/flywheel/issues/248) is an operator raising
exactly this. Treat notes-field truncation as a safety defect and escalate accordingly,
whichever side of the seam turns out to own the truncation.

---

## 9. Working with third-party vendors in the ticket

Most boundary tickets are resolved faster with the vendor present. FSG may bring a
vendor into a thread, subject to these rules:

- **The operator invites, not us.** They hold the contract. Ask them to add the vendor.
- **Announce the addition.** An operator who discovers a third party silently copied into
  their thread will complain, and will be right to.
- **Expect automated CC traffic back.** Once a cross-vendor thread exists, the other
  side's helpdesk will generate its own notifications — "this address has been added to
  the CC list" and similar — which arrive in our queue and open tickets of their own.
  [FW-232](https://github.com/podlodka-ai-club/flywheel/issues/232) is one, generated by a
  third-party helpdesk on a shared records-system integration ticket. These carry no
  content and should be triaged **Non-support** and closed, not worked.
- **Never share facility data with a vendor the operator has not introduced.** This
  includes subject data, addresses, credentials, and configuration.
- **State our position once, in writing, with evidence.** Then let the vendor respond.
  Arguing the boundary in a shared thread is unproductive and is read as defensiveness.

### Saying "this is not ours" without saying it

Never send a bare deflection. The template that works:

> We have traced this from our side. We submitted *<what>* at *<timestamp>* to
> *<endpoint>*, and received *<verbatim response>*. That indicates the request was
> rejected before processing at *<system>*. We have attached the full log extract so
> your vendor can locate the matching inbound request. If it would help, we are happy to
> join a call with them — and if it turns out anything in our payload is wrong, we will
> of course correct it.

It concedes nothing and offers everything. It also survives being forwarded, which
matters, because it will be.
