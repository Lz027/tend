# Backend Migration Guide — Pathlight

This guide covers moving the app from the built-in Lovable Cloud backend to your own Supabase project, then deploying the frontend on Netlify.

## What you will move

1. Database schema, migrations, and seed data.
2. Auth users and identities.
3. Storage buckets and policies (if you later add file uploads).
4. Environment variables for the frontend build.

## Prerequisites

- A Supabase project (new or existing).
- Supabase CLI installed locally (`npm i -g supabase`).
- Netlify account and CLI (or Git-connected Netlify site).
- Node.js 20+ and `bun` or `npm` for local builds.

## 1. Export the current schema

From the project root:

```sh
# Link to your new Supabase project when prompted
supabase link --project-ref <your-project-ref>

# Pull the current schema into a migration file
supabase db dump --data-only=false --schema public > supabase/migrations/00000000000000_remote_schema.sql
```

If you also want to copy seed/demo data:

```sh
supabase db dump --data-only --schema public > supabase/seed.sql
```

## 2. Apply the schema to your new Supabase project

```sh
supabase db push
```

This runs every migration in `supabase/migrations/` in order.

## 3. Migrate auth users

Auth users live in the `auth` schema, which is not included in the public-schema dump. You have two options:

### Option A — use Supabase CLI (recommended for small projects)

1. In the Lovable Cloud project, go to Authentication → Users.
2. Export users as CSV if available, or use the Management API.
3. In your new project, create users with the same email/phone and ask them to reset passwords, OR use the Supabase Admin API to recreate users while preserving UUIDs.

### Option B — keep it simple for a portfolio/personal project

For a fresh personal instance, create your own owner account after deployment and re-invite any teammates. This avoids auth migration complexity.

## 4. Recreate storage buckets

The current app does not use storage, but if you add file uploads later:

```sql
-- Example: create a public bucket for attachments
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);
```

Then add RLS policies on `storage.objects`.

## 5. Update environment variables

In your Netlify site settings (or local `.env`):

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

Optional, depending on features:

```env
VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

Remove or ignore the old Lovable Cloud variables. The frontend only reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time.

## 6. Configure auth providers in your new Supabase project

- Enable Email provider.
- Enable Google provider and add your OAuth credentials.
- Set the site URL and redirect URLs to your Netlify domain (`https://your-site.netlify.app` and `https://your-site.netlify.app/auth`).

## 7. Deploy to Netlify

### Build settings

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 20 (or whatever your project requires)

### Redirects

TanStack Start handles client-side routing. Add a catch-all redirect in `public/_redirects`:

```text
/* /index.html 200
```

Or configure it in `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 8. Post-migration checks

1. Sign up/in on the Netlify URL.
2. Create a workspace.
3. Create a form and submit it through the public URL.
4. Confirm the lead appears in the lead list with score and owner.
5. Confirm tasks and notifications are created.
6. Run the Supabase linter and review any RLS warnings.

## 9. Keeping migrations in sync

After migration, treat `supabase/migrations/` as the source of truth for schema changes. Never edit applied migration files; add new files for changes and run `supabase db push`.

## Notes

- The app uses Supabase client-side auth with RLS. Keep RLS policies enabled and test with an anon key.
- Server functions use `createServerFn` from TanStack Start and run in an edge environment. If you add custom server functions that need Node-only packages, test them in a production build before shipping.
- Email sending requires a verified domain in Supabase. Until then, assignment emails queue in-app.
