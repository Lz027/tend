# Poppy — lead workspace for small creative teams

## Positioning

Poppy is a bright, friendly lead workspace for freelancers, small web/design agencies and
local service businesses. Tagline: **"Leads that pop up, sorted."**
Promise: turn scattered enquiries into the next clear action.

Poppy owns the lead record, qualification, routing, tasks, timeline and event history.
Make, n8n and Zapier stay optional connectors — data in, events out. Poppy is not an
automation builder.

## Hero workflow (the demo everything supports)

```text
Visitor submits the project enquiry form
→ validate, store, capture consent + UTM attribution
→ duplicate check (normalised email, then phone)
→ score with visible reasons: 86 — Hot
→ assign an owner by rule, round-robin fallback
→ create a high-priority follow-up task with an SLA clock
→ record every step on the timeline
→ send a signed lead.qualified event to n8n/Make, with a delivery log and replay
```

## Brand and design system

- Berry violet `#5b5bd6` primary, violet `#8b5cf6`, pink `#f472b6` accent,
  warm yellow `#fde68a` highlight, soft off-white background, charcoal-violet text,
  lavender-grey borders.
- Rounded cards, chunky status badges, friendly empty states, subtle scale/bounce on press.
- Rounded display face for headings, clean sans for body. Poppy bloom mark.
- Copy: "Your pipeline is clear. New opportunities will pop up here." / "Connect your tools." /
  "This connection needs attention."
- Tokens live in `src/styles.css`; components keep using semantic tokens.

## Build order

### Phase 1 — Brand and shell
Palette, type, mark, rewritten `docs/brand-guidelines.md`, refreshed app shell and dashboard.

### Phase 2 — Core lead workflow (the hero path)
- Form editor with preview and agency-flavoured default questions (what you need help with,
  service, budget, start timing, how you found us, project details).
- Public form at `/f/{slug}`: responsive, accessible, consent text + version + timestamp,
  UTM/referrer/landing-page capture, honeypot + payload limits, success and error states.
- Public submission endpoint that validates, normalises, dedupes, creates lead + submission +
  consent + timeline entries, scores, routes, creates the SLA task, then returns fast and
  queues notifications and outbound events.
- Explainable scoring: bands Cold 0–29, Warm 30–59, Qualified 60–79, Hot 80–100, with
  per-rule reasons stored on the lead.
- Routing with recorded reason, previous owner, rule applied, timestamp.

### Phase 3 — Workspace experience
- Dashboard: pipeline snapshot, hot leads needing an owner, overdue follow-ups.
- Lead list: search, status/band/owner/source/date filters, tags, sorting, saved views,
  bulk assign and bulk status change.
- Lead detail with a **Recommended next action** panel at the top — the action, the reasons,
  and buttons for Email lead / Assign / Create task / Mark contacted.
- Separate **Qualification score** and **Engagement health** (at risk after inactivity).
- Immutable timeline that visually separates system events from human actions.
- Tasks page with SLA due dates and overdue state; in-app notifications.
- Rules page with a **Test a lead** simulator: enter sample data, see score, reasons, route
  and the task that would be created.

### Phase 4 — Automations
- Inbound: named sources, unique token in the URL (hash stored), workspace resolved from the
  token only, sample-payload capture, field mapping onto Poppy fields, payload log, validation
  errors, last-received time, enable/disable, token regeneration.
- Outbound: endpoints with event subscriptions (`lead.created`, `lead.qualified`,
  `lead.assigned`, `lead.score_changed`, `lead.status_changed`, `task.created`, `task.overdue`),
  HMAC-signed payloads, field selection with safe defaults, delivery log, retry, replay,
  send test event, rotate secret.
- Automation health summary: active endpoints, success rate, retries today, endpoints needing
  attention; per-endpoint last success/failure, consecutive failures, average response time.
- Make and n8n setup cards with step-by-step copy.

### Phase 5 — Polish and case study
Source-performance view (leads, qualified, rate per source), SLA escalation (owner at 4h,
admin at 8h, lead marked at risk), optional AI assist as suggestions only
(summarise message, suggest score, draft reply — always Apply / Edit / Ignore),
accessibility and responsive passes, microcopy, and the docs set: product overview,
architecture, database design, webhook docs, security decisions, demo walkthrough,
known limitations, roadmap.

`roadmap.md` gets rewritten to this phase list at the start of the build.

## Technical notes

- Stack stays TanStack Start on Lovable Cloud. Server functions handle app-internal logic;
  the public form post and inbound webhook are server routes under `/api/public/*`.
  No Supabase Edge Functions.
- New tables (all `workspace_id`-scoped, RLS + grants): `automation_sources`,
  `automation_endpoints`, `automation_events`, `automation_deliveries`, `lead_tags`,
  `lead_tag_assignments`, `saved_views`. Existing leads table gains normalised email/phone,
  first/last touch source, engagement state, and tags.
- Events are immutable; deliveries stay separate from the lead timeline.
- Idempotency keys on form submissions and inbound webhook events.
- Outbound signature over `timestamp + "." + raw_body`, sent as `X-Poppy-Timestamp`,
  `X-Poppy-Signature`, `X-Poppy-Event-Id`. Retry schedule: immediate, 1m, 5m, 30m, 2h,
  retrying only timeouts, 408, 429 and 5xx. Delivery work is drained by a scheduled
  public route rather than a live queue product.
- Email sending needs a verified sending domain; until then notifications are in-app only
  and email deliveries stay queued and visible.
