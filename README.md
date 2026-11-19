# CutePet

Online store for handmade pet clothing from La Paz, Bolivia.
Customers pay with Bolivia's interoperable bank QR and upload their payment proof, or place the order through WhatsApp.

## Stack

- **Angular 22** — signals, zoneless, SSR for link previews and SEO
- **Angular Material 3** — custom theme
- **Supabase** — Postgres with RLS, Auth (anonymous checkout, Google login), Storage, Edge Functions
- **pnpm**, ESLint with architecture boundaries, Vitest

## Getting started

Requirements: Node 24, pnpm 10+, Docker and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```bash
git clone <repository-url> cutepet && cd cutepet
pnpm install
supabase start        # local Supabase stack in Docker (the first run downloads the images)
supabase db reset     # create the local database from supabase/migrations
pnpm db:types         # generate src/app/core/supabase/database.types.ts
pnpm start            # http://localhost:4200
```

- `pnpm start` uses the fallback values in `src/environments/environment.development.ts`, which point to the local stack. If `supabase status` shows a different API URL or publishable key, update that file.
- Local Studio (tables, users, SQL editor) runs at http://127.0.0.1:54323.
- Production builds have no configuration inside. The server reads `SITE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NG_ALLOWED_HOSTS` and `NO_INDEX` when it starts (see `docs/deploy.md`).

## Scripts

| Command                    | Description                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| `pnpm start`               | Dev server                                                            |
| `pnpm check`               | Format check, lint, tests and build                                   |
| `pnpm build`               | Production build with SSR                                             |
| `pnpm db:types`            | Regenerate database types from the local Supabase database            |
| `pnpm db:test:concurrency` | Prove that a unique item is never sold twice under real concurrency   |
| `pnpm db:seed:images`      | Upload the seed placeholder photos to the local `store-images` bucket |

## Database

The schema lives in `supabase/migrations/`. Development uses the local Supabase stack (requires Docker):

```bash
supabase start                # start the local stack
supabase db reset             # recreate the local database from the migrations + supabase/seed.sql
pnpm db:seed:images           # upload the seed photos (local only)
supabase test db              # pgTAP tests for RLS and every order and stock rule
pnpm db:test:concurrency      # several sessions race for the same item; exactly one must win
```

`supabase/seed.sql` is local test data (products in every catalog state). It never reaches production: `supabase db push` does not run it.

pgTAP runs in a single database session, so it cannot show two customers paying at the same moment. `pnpm db:test:concurrency` opens several sessions at once against the local database and checks that the row lock makes all but one of them fail.

## Deploying the database

The remote project is never changed without asking the owner first.

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push --dry-run   # list the migrations that would be applied
supabase db push             # apply them
```

`supabase db push` only applies migrations (never `seed.sql`). These settings live in the dashboard and must be set by hand once:

1. **Authentication → Sign In / Providers:** enable anonymous sign-ins and manual linking (so a guest's anonymous identity can be linked to Google).
2. **Authentication → Sign In / Providers → Google:** enable it with the OAuth client ID and secret from Google Cloud. In Google Cloud, add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
3. **Authentication → URL Configuration:** set the Site URL to the production domain and add it to the redirect URLs.
4. **Authentication → Auth Hooks:** enable the Custom Access Token hook with `public.custom_access_token_hook`.

### First admin

1. Sign in once on the site with the owner's Google account.
2. Copy the user id from **Authentication → Users**.
3. In the SQL editor run:

   ```sql
   insert into public.user_roles (user_id, role) values ('<user-id>', 'admin');
   ```

4. Sign out and in again so the new JWT carries `app_metadata.role = admin`.

## Hosting

The app ships as a Docker image (`Dockerfile`, port 4000) deployed with Coolify. Environment variables, Cloudflare, Supabase and rollback: `docs/deploy.md`. A free scheduled job (e.g. a GitHub Action) queries Supabase daily so the free project is not paused.

## Dependency security

`pnpm-workspace.yaml` blocks install scripts except for the packages in `allowBuilds` and enforces `trustPolicy: no-downgrade`. Do not add exceptions or relax these settings without asking.

The UI is in Spanish (Bolivia); code and docs are in English.
