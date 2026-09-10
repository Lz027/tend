# Beconlane — MVP build plan

A lead-generation workspace: publish a form, capture leads, score and route them automatically, follow up with tasks, and track status on a full activity timeline.

## Scope for this build

The section 16 vertical slice, plus configurable scoring and routing rules. App only — no public marketing site. In-app notifications plus real emails for lead assignment.

Not in this build: analytics dashboards beyond simple counters, CSV import/export, webhooks, kanban board, merge UI, ad-platform integrations.

## Look and feel

Carried over from the uploaded Beaconlane app: light violet-tinted workspace (#635bff violet, mint and coral accents), soft cards with generous radius, Georgia serif page headings against a clean sans body, left sidebar rail with the workspace switcher and user row at the bottom.

## What gets built

### 1. Accounts and workspaces
- Email/password sign-up, sign-in, password reset.
- On first sign-in the user creates a workspace (name, timezone, currency).
- Invite teammates by email with a role: Owner, Admin, Manager, Member, Viewer.
- Workspace switcher for people in more than one workspace.
- All data strictly scoped to a workspace; removing a member revokes access immediately.

### 2. Form builder and hosted forms
- Create a form, pick from the standard field set (name, email, phone, company, job title, country, interest, budget, message, preferred contact) plus custom text/select/checkbox fields.
- Required fields, field order, submit-button text, success message, optional redirect URL, consent checkbox with its own wording, active/inactive toggle.
- Each form gets a public hosted URL plus copy-paste embed snippets (script tag and iframe).
- Submissions capture UTM values, referring page, landing page, device type and timestamp automatically.
- Honeypot plus rate limiting on submission; disabled forms reject new entries.

### 3. Leads
- Lead list with search (name, email, phone, company, ID), filters by status, owner, source, form and date, sorting, and bulk assign / bulk status change.
- Lead detail page: contact details, qualification fields, ownership, attribution, consent state, and an activity timeline newest-first.
- Notes, status changes with lost reason and won value, do-not-contact toggle.
- Duplicate handling: a repeat email or phone appends to the existing lead's timeline instead of creating a second record, fills only blank fields, and flags the duplicate. Admins can merge two leads manually.

### 4. Scoring
- Rule list an admin can edit: condition, points, priority, active toggle. Seeded with the PRD's default model (business email +10, budget above threshold +20, demo request +25, invalid email -30, do-not-contact -100, and so on).
- Score recalculates whenever relevant fields change; the lead page shows a breakdown of which rules fired.
- Bands: Hot 70-100, Warm 40-69, Cold 0-39, Disqualified below 0.
- Manual override with a logged reason.

### 5. Routing
- Rule list with priority ordering: do-not-contact check, product/service rule, country rule, score rule, then round-robin fallback.
- Assignment to a user or a team, or the visible Unassigned queue when nothing matches.
- Every assignment is written to the timeline and notifies the assignee.

### 6. Tasks and follow-up
- Tasks on a lead: title, type (call, email, meeting, message, research, follow-up, other), due date, assignee, priority, status.
- New qualified leads automatically get a "Contact lead" task, due per the score band SLA (Hot 15 min, Warm 4 hours, Cold 1 business day).
- Tasks page with upcoming, overdue (clearly flagged), and per-teammate views.

### 7. Notifications
- In-app notification bell: new lead assigned, reassigned, high-score lead, task due soon, task overdue, unassigned lead.
- Email for lead assignment and overdue follow-up, with per-user opt-out for non-critical types.

## Technical notes

- Lovable Cloud provides the database, authentication and server runtime; every table carries `workspace_id` with row-level policies keyed to workspace membership, and roles live in a separate membership table so they cannot be escalated from the client.
- Tables: workspaces, memberships, invitations, leads, lead_submissions, activities, tasks, forms, scoring_rules, routing_rules, consent_records, notifications, audit_log — matching the PRD data model.
- Public form fetch and submission run through unauthenticated server routes under `/api/public/`, with payload validation, honeypot, rate limiting, idempotency keys, normalization (email lowercased, phone to E.164), duplicate matching, consent capture and safe error responses.
- Scoring, routing, task creation and notification dispatch run server-side in one transaction after a submission is accepted, so a lead is never stored unassigned by accident.
- Emails need a verified sending domain. If none is set up yet, assignment emails queue and surface in-app until the domain is verified — I will flag this when we reach that step.

## Build order

1. Cloud setup, schema, auth, workspace creation and invites.
2. Form builder, hosted form, public submission endpoint, submission storage.
3. Lead list, lead detail, timeline, statuses, notes, duplicate handling.
4. Scoring rules and score explanation.
5. Routing rules, assignment, unassigned queue.
6. Tasks, SLA automation, notifications in-app and email.
