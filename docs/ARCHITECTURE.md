# CutePet architecture

Goal: simple code, no duplication, easy to change. When in doubt, choose the option with fewer pieces.

## Layers and dependencies

```
src/app/
├── core/       App singletons: Supabase, auth, layout, guards.
├── shared/     Generic and reusable: dumb UI, helpers, pipes. Knows nothing about the business.
└── features/   One folder per business feature.
```

Rules (enforced by ESLint `no-restricted-imports`):

| From       | May import                              |
| ---------- | --------------------------------------- |
| `shared`   | External libraries only                 |
| `core`     | `shared`                                |
| `features` | `core`, `shared` and **its own folder** |

A feature **never** imports another feature. If two features need the same thing, move it to `shared` (if generic) or `core` (if app-specific). Exception: the cart is used by several screens, so its state lives in `core/cart` once it is built.

## Feature structure

Create only the folders you need. No empty folders "just in case".

```
features/catalog/
├── catalog.routes.ts      Lazy routes for the feature
├── pages/                 Routed "smart" components: inject the store, connect UI and data
├── ui/                    "Dumb" presentational components: only input()/output(), no data injection
├── data-access/
│   ├── product.repository.ts   The only place with Supabase queries for this feature
│   └── catalog.store.ts        Signal-based state; uses the repository
└── models/                Domain types and DB row → model mappers
```

## Data flow

```
Supabase ──▶ Repository ──▶ Store (signals) ──▶ Page ──▶ UI components
             (unwrap)       resource()/computed  inject   input()/output()
```

- **Repository**: Supabase queries, uses `unwrap()` from `@shared/data-access/supabase-result`, returns domain models (not raw rows). No UI logic.
- **Store**: `@Service()` with private writable signals and public read-only `computed()`. Use `resource()` for loading (`isLoading`, `error` and `value` for free). No RxJS unless truly needed.
- **Page**: injects the store, passes data to `ui/` components and reacts to their `output()`.
- **UI**: never injects data services. Reusable and testable in isolation.

## Critical business rules live in the database

Everything that protects money or stock lives in Postgres, not in Angular:

- Reserve, confirm, cancel, restore and revert orders, quick sale and stock adjustment: RPC functions (`security definer`) that validate and change status + stock in one transaction.
- Audit log: triggers.
- Permissions: RLS on every table; the Angular guard is only a UI convenience.
- Migrations live in `supabase/migrations/`; then run `pnpm db:types` to regenerate `database.types.ts`.

## Notifications and AI (server side)

```
orders (status → proof_uploaded) ──trigger/webhook──▶ Edge Function `notify`
                                                        ├─ (optional, later) OpenRouter vision check
                                                        └─ for each active row in notification_channels
                                                             ├─ telegram → chat_id
                                                             └─ email    → address
```

- Channels are data, not code: adding a recipient is a row in `notification_channels` (type, destination, subscribed events, active).
- The AI step is optional and only adds information to the alert; it never confirms a payment.
- Secrets (Telegram bot token, OpenRouter API key, email provider key) are Edge Function secrets.

## Styles

- Angular Material components first. Before building a custom component, check that Material does not already have it.
- Colors, spacing, radius and fonts only through `--cp-*` tokens (`src/styles/_tokens.scss`) or `--mat-sys-*` variables. Never a hex value inside a component.
- Cherry red (`.cp-cta`) only for the main buy button.
- Mobile first: most customers buy from their phone.

## SSR

- Home, catalog, product and sold gallery are rendered on the server so WhatsApp link previews and Google show real content. Set `Title`/`Meta` (Open Graph: image, name, price) from product data.
- Never use `window`, `document` or `localStorage` directly: guard with `isPlatformBrowser` or `afterNextRender`.
- On the server the Supabase client has no session: public data only.
- Angular SSR only answers hosts listed in `NG_ALLOWED_HOSTS` (SSRF protection).

## Conventions

- Code in English; visible text and URLs in Spanish (see the glossary in `CLAUDE.md`).
- Angular 2025 file naming: `catalog-page.ts` → class `CatalogPage`.
- Selector prefix: `cp-`.
- Path aliases: `@core/*`, `@shared/*`, `@features/*`, `@env/*`. Never `../../..`.
- Currency: `currency` pipe (locale `es-BO` and currency `BOB` are already configured).
