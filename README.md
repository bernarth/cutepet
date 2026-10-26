# CutePet

Online store for handmade pet clothing from La Paz, Bolivia.
Customers pay with Bolivia's interoperable bank QR and upload their payment proof, or place the order through WhatsApp.

## Stack

- **Angular 22** — signals, zoneless, SSR for link previews and SEO
- **Angular Material 3** — custom theme
- **Supabase** — Postgres with RLS, Auth (anonymous checkout), Storage, Edge Functions
- **pnpm**, ESLint with architecture boundaries, Vitest

## Getting started

Requirements: Node 24 and pnpm 10+.

```bash
pnpm install
pnpm start        # http://localhost:4200
```

Add your Supabase project URL and publishable key to `src/environments/environment.ts`.

## Scripts

| Command         | Description                                 |
| --------------- | ------------------------------------------- |
| `pnpm start`    | Dev server                                  |
| `pnpm check`    | Format check, lint, tests and build         |
| `pnpm build`    | Production build with SSR                   |
| `pnpm db:types` | Regenerate database types from Supabase     |

## Docs

- [Specification](docs/spec.md) — business rules and scope
- [Architecture](docs/ARCHITECTURE.md) — layers, data flow and conventions
- [CLAUDE.md](CLAUDE.md) — rules for AI-assisted development

The UI is in Spanish (Bolivia); code and docs are in English.
