# CutePet

Online store for handmade pet clothing from La Paz, Bolivia.
Customers pay with Bolivia's interoperable bank QR and upload their payment proof, or place the order through WhatsApp.

## Stack

- **Angular 22** — signals, zoneless, SSR for link previews and SEO
- **Angular Material 3** — custom theme
- **Supabase** — Postgres with RLS, Auth (anonymous checkout), Storage, Edge Functions
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

- `pnpm start` uses `src/environments/environment.development.ts`, which points to the local stack. If `supabase status` shows a different API URL or publishable key, update that file.
- Local Studio (tables, users, SQL editor) runs at http://127.0.0.1:54323.
- Production builds use `src/environments/environment.ts`, which points to the remote Supabase project.

### Remote Supabase project

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push      # apply new migrations to the remote project
```

`supabase db push` only applies migrations. Auth settings live in the dashboard: anonymous sign-ins (**Sign In / Providers**) and the Custom Access Token hook `public.custom_access_token_hook` (**Auth Hooks**).

## Scripts

| Command                    | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `pnpm start`               | Dev server                                                          |
| `pnpm check`               | Format check, lint, tests and build                                 |
| `pnpm build`               | Production build with SSR                                           |
| `pnpm db:types`            | Regenerate database types from the local Supabase database          |
| `pnpm db:test:concurrency` | Prove that a unique item is never sold twice under real concurrency |

## Database

The schema lives in `supabase/migrations/`. Development uses the local Supabase stack (requires Docker):

```bash
supabase start                # start the local stack
supabase db reset             # recreate the local database from the migrations
supabase test db              # pgTAP tests for RLS and every order and stock rule
pnpm db:test:concurrency      # several sessions race for the same item; exactly one must win
```

pgTAP runs in a single database session, so it cannot show two customers paying at the same moment. `pnpm db:test:concurrency` opens several sessions at once against the local database and checks that the row lock makes all but one of them fail.

The UI is in Spanish (Bolivia); code and docs are in English.
