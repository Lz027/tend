# Poppy — playful rebrand + plug-and-play automations + core features

## The idea

Rename the product to **Poppy**: a bright, friendly lead workspace that captures enquiries,
scores and routes them automatically, and plugs straight into Make.com, n8n or Zapier so
leads can flow in and out without any custom code.

## Brand

- Name: Poppy. Tagline: "Leads that pop up, sorted."
- Palette (blueberry pop): berry violet `#5b5bd6` primary, `#8b5cf6` secondary,
  pink `#f472b6` accent, warm yellow `#fde68a` highlight, soft off-white page background.
- Personality: playful, warm, confident. Short cheerful copy, friendly empty states,
  light bounce on buttons and cards, rounded corners, chunky badges.
- Typography: a rounded display face for headings, clean sans for body (replaces the
  current Georgia serif headings).
- Mark: a simple poppy bloom / spark shape in berry violet.
- `docs/brand-guidelines.md` rewritten for Poppy; backend guide updated with the new name.

## Plug-and-play automations

A new **Automations** page in the workspace with two halves:

**Leads in (from your tools)**
- Generate a unique secret inbound link per workspace.
- Paste that link into a Make/n8n/Zapier webhook step; any JSON sent to it becomes a lead.
- A field-mapping screen: send a sample payload, see the detected fields, drag them onto
  Poppy fields (name, email, phone, company, message, custom). Mapping is saved per source.
- Incoming leads run the same duplicate check, scoring, routing and task rules as form leads.
- A live log of the last received payloads so you can see what arrived and why it mapped that way.

**Events out (to your tools)**
- Add one or more outgoing links, pick which events to send: new lead, lead assigned,
  score band changed, status changed, task overdue.
- Signed payloads, retry on failure, delivery log with replay.
- One-click copy of a sample payload so you can build the automation on the other side.

Ready-made setup cards for Make.com, n8n and Zapier with step-by-step copy for each.

## Core features finished in this build

- Form edit page; public hosted form at `/f/{slug}` with consent capture and attribution.
- Public submission endpoint creating lead + submission + consent + timeline entry.
- Duplicate detection: normalised email first, phone second.
- Rule-based scoring with visible reasons; priority routing with round-robin fallback.
- Automatic follow-up task per qualified lead, with SLA due dates and overdue flags.
- Lead list with filters, lead detail with activity timeline, status and owner changes.
- Tasks page, in-app notifications, and email notifications.
- Rules page to edit scoring and routing without touching code.
- Playful dashboard refresh: stat cards, score-band chips, friendly empty states.

## Technical notes

- New tables: `automation_sources` (inbound link, secret, field mapping, log),
  `automation_endpoints` (outgoing URL, event subscriptions, secret),
  `automation_deliveries` (attempts, status, payload). All workspace-scoped with RLS,
  grants, and owner/admin-only management.
- Inbound webhook lives at `/api/public/automations/{token}` with secret verification,
  payload size limits and rate-safe handling; it never trusts the sender's workspace id.
- Outbound events are signed with an HMAC header and retried with backoff.
- Design tokens for the new palette go in `src/styles.css`; components keep using semantic
  tokens so the theme stays swappable.
- Email sending needs a verified sending domain; until that is set up, notifications appear
  in-app and stay queued.

## Order of work

1. Palette, type, mark, and brand docs for Poppy.
2. Public form + submission + scoring/routing/tasks.
3. Leads list, detail, timeline, notifications, rules page.
4. Automations: inbound link and mapping, then outgoing events and logs.
5. Desktop and mobile pass over every screen.
