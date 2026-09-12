# Beconlane — clarify brand, document backend path, finish MVP

## Where we are now

The backend foundation is complete and the first app screens are wired up:

- **Database**: workspaces, memberships/roles, invitations, forms, leads, submissions, activities, tasks, scoring_rules, routing_rules, consent_records, notifications, notification_preferences, audit_log — all with RLS, grants, indexes, and update triggers.
- **Auth**: email/password and Google OAuth enabled.
- **App shell**: protected layout with sidebar, mobile drawer, workspace/user display, sign-out, and navigation to Overview, Leads, Forms, Tasks, and Rules.
- **Dashboard**: workspace setup form, simple counters, and a recent-leads list.
- **Index route**: still shows the Lovable placeholder; needs to redirect to `/auth` or `/dashboard`.

## What is still missing for the core MVP vertical slice

1. Form builder + hosted public form + embed snippets.
2. Public submission endpoint (honeypot, rate limiting, duplicate handling, consent capture).
3. Lead list with search/filter/sort/bulk actions.
4. Lead detail page with timeline, status changes, notes, do-not-contact, duplicate flag.
5. Scoring engine and score-band breakdown.
6. Routing engine with priority rules + round-robin fallback.
7. Tasks page + automatic "Contact lead" SLA task creation.
8. In-app notification bell + email dispatch for assignment/overdue.
9. Rules management pages for scoring and routing.

## End goal

A self-contained lead workspace: a team creates a form, publishes it, receives enquiries, sees each lead automatically scored and routed to the right owner, gets a follow-up task with a SLA, and can track every status change and note on a per-lead timeline.

## Brand direction

- **Personality**: professional and calm — clean, trustworthy, enterprise-ready.
- **Color palette**: keep the current violet/mint/coral accents on a light, warm background.
- **Typography**: Georgia serif for page headings, clean sans-serif for body and UI text.
- **Name options** (the current "Beconlane" feels slightly awkward):
  - **Pathlight** — guidance, clarity, forward motion.
  - **Converlane** — conversion + lane; keeps the "lane" concept.
  - **Northlane** — directional, calm, suggests the right path.
  - **Beaconlane** — close to the original but clearer spelling.

Recommended: **Pathlight** for a portfolio piece, because it is distinctive, easy to spell, and communicates the product promise without being tied to sales jargon.

## Deliverables in this plan

1. **Brand decision**: confirm the final product name and lock the visual identity (colors, typography, voice).
2. **Documentation**:
   - `docs/brand-guidelines.md` — name, tagline, colors, typography, tone, logo usage.
   - `docs/backend-migration-guide.md` — step-by-step move from Lovable Cloud to your own Supabase project + Netlify deployment, covering schema export/import, auth users, storage buckets, environment variables, and post-migration checks.
3. **Finish the MVP**:
   - Replace the placeholder index with a redirect.
   - Build form builder, public form, and submission endpoint.
   - Build lead list and lead detail with timeline.
   - Implement scoring and routing engines.
   - Build tasks and notifications.
   - Add rules management pages.
   - Verify desktop and mobile flows.

## Technical notes for the migration guide

- Schema is managed through Supabase migrations in `supabase/migrations/`.
- Auth users live in the `auth` schema and must be migrated via Supabase CLI or exported/imported carefully.
- Storage buckets and policies need to be recreated in the target project.
- Environment variables for Netlify: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, plus any email/SMTP or OAuth secrets.
- The app is built with TanStack Start and deploys as a static/edge bundle suitable for Netlify.

## Suggested build order

1. Brand name confirmation + brand/backend docs.
2. Replace placeholder index and polish auth/dashboard shell.
3. Form builder + public form + submission endpoint.
4. Lead list + lead detail + timeline.
5. Scoring + routing engines and rule pages.
6. Tasks + notifications.
7. End-to-end verification.
