# CutePet — MVP specification

> Business source of truth. If the code contradicts this document, ask before changing either.
> Customer-facing text is Spanish; Spanish terms are kept in quotes where they matter.

## Summary

Online store for handmade pet clothing based in La Paz, Bolivia. Customers buy in two ways: paying with a bank QR code and uploading the payment proof, or sending the order through WhatsApp.

- Informal, early-stage business (Bs 200 to Bs 2,000 per month). Payments go to a personal bank account through Bolivia's interoperable QR ("QR Simple"); there is no payment gateway.
- CutePet sells ready-made items only (no made to order). Today every model is unique (stock 1), but the system tracks stock per size. Pieces made to measure go through custom requests.
- Low volume. The owner validates payments manually.
- **Zero cost:** only the domain is paid. Supabase free plan; the owner hosts the site on her own server.
- Principle: minimal for the customer; nothing is deleted, everything can be corrected, everything is audited.

## Stack

| Layer         | Choice                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Frontend      | Angular 22 (signals, zoneless) + Angular Material 3, pnpm                                             |
| Rendering     | Angular SSR (Node/Express). Hosting is handled by the owner                                           |
| Backend       | Supabase free: Postgres + RLS, Auth (anonymous + Google), Storage, Edge Functions                     |
| Notifications | Edge Function `notify` → Telegram and email (multiple recipients)                                     |
| AI            | Out of the MVP. Later: OpenRouter vision model inside `notify`                                        |
| Keep-alive    | Free scheduled job (e.g. GitHub Action) that queries Supabase daily so the free project is not paused |

## Roles and audit

- **Guest:** Supabase anonymous user, created only when a QR checkout starts (not on every visit).
- **Customer with account:** order history and "Mis mascotas" (my pets) with saved measurements.
- **Admin:** owner and helpers. The role travels in the JWT (`app_metadata.role`), set by a custom access token hook.
- **Login:** customers are guests by default; an account is optional. **Google OAuth is the only login**, for customers and admins alike. On sign-in, the anonymous identity is linked to the Google account (`linkIdentity`, needs manual linking enabled) so the guest's orders stay with the customer.
- No email/password and no magic link for now: Supabase's default SMTP only sends to project team members, so it cannot email customers.
- **Audit log:** Postgres triggers record who, when, entity, old value, new value and reason. Cancel, restore, reject proof, revert status and stock adjustment require a reason.

## Pages

| Route             | Page                                                     | Render    |
| ----------------- | -------------------------------------------------------- | --------- |
| `/`               | Home: hero photo, categories, featured products          | Server    |
| `/catalogo`       | Grid with filters (pet type, category, size)             | Server    |
| `/catalogo/:slug` | Product: photos, size, "¿Cuál es su talla?", add to cart | Server    |
| `/carrito`        | Summary + "Pagar con QR" / "Pedir por WhatsApp"          | Client    |
| `/pagar`          | QR, amount, order code, countdown, upload proof          | Client    |
| `/guia-de-tallas` | How to measure + size table + size calculator            | Server    |
| `/personalizado`  | Custom request form                                      | Prerender |
| `/mi-cuenta`      | Orders, order status by link, my pets                    | Client    |
| `/admin`          | Admin panel                                              | Client    |

"Server" pages must set Open Graph tags (image, name, price) for WhatsApp link previews.

## Catalog and stock

- **Product:** name, slug, description, pet type, category, photos, price (BOB), active.
- **Variant:** size, measurements (neck, chest, back length in cm), stock, `reserved_until` (internal; the customer never fills it).
- **Available** = stock not sold and no active reservation. Computed on read; no cleanup job.
- **Sold out** (no stock left) = hidden from customers, still visible in the admin. A stock adjustment (with a reason) makes it visible again.

## Purchase flows

**QR checkout ("Pagar con QR")** — can be switched off from the panel

1. Name and phone are required (8 digits, starts with 6 or 7) + delivery method.
2. Order created as `pending_payment`; atomic reservation for N minutes (configurable, default 15).
3. Payment screen: QR, exact amount, order code to type in the transfer reference ("glosa"), validation hours.
4. Customer uploads the payment proof (private bucket) → `proof_uploaded`; the items stay locked with no expiry.
5. `notify` alerts every active notification channel. The admin checks the bank app and confirms or rejects.
6. Reservation expires without a proof → automatic cancellation and stock released.

**WhatsApp order ("Pedir por WhatsApp"):** `wa.me` link with the order prefilled (items, sizes, total, delivery). No order code: the order is recorded later by the admin as a quick sale (see "Step 4" in Decisions).

**Quick sale (admin):** every sale made through WhatsApp is recorded as an **order with channel `whatsapp`**, directly in `confirmed` (pick items, name, phone, delivery). Stock is never lowered by hand to record a sale.

**Stock adjustment (admin):** only for corrections (damaged item, data entry error), with a required reason; audited.

**Conflicts:** item already sold → "Esta prenda ya fue vendida" and it is removed from the cart; reserved by someone else → "Alguien está pagando esta prenda, vuelve a intentarlo en unos minutos".

## Order statuses

`pending_payment` → `proof_uploaded` → `confirmed` → `ready_for_pickup` | `shipped` → `delivered`; `cancelled` from any status before delivery.

| Status             | UI label (es)      | Stock                  |
| ------------------ | ------------------ | ---------------------- |
| `pending_payment`  | Pendiente de pago  | Reserved for N minutes |
| `proof_uploaded`   | Comprobante subido | Locked, no expiry      |
| `confirmed`        | Confirmado         | Sold                   |
| `ready_for_pickup` | Listo para recoger | Sold                   |
| `shipped`          | Enviado            | Sold                   |
| `delivered`        | Entregado          | Sold                   |
| `cancelled`        | Cancelado          | Released               |

- **Cancel** releases stock; the order is never deleted.
- **Restore** a cancelled order takes the items again; if any is no longer free, the system warns and never sells it twice.
- **Revert** a step: back to the previous status with a required reason.
- Each order shows its timeline (who, when, why).

## Delivery

| Method                | Data requested                                   | Cost                                                             |
| --------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| Pickup point (La Paz) | Name, phone                                      | Bs 2 paid at pickup; free from 3 items (configurable)            |
| Bus parcel shipping   | Destination city, recipient name, ID if required | Paid by the customer at the bus terminal; not added to the total |

After purchase: pickup point directions, opening hours and a notice about an extra charge after 1 week. For shipping, the admin attaches the shipping receipt and sends it through WhatsApp.

## Settings (admin panel)

QR checkout on/off and alternative message · QR image + expiry date (warning "vence en X días") · reservation minutes · validation hours · store WhatsApp number · pickup point (address, hours, notice) · items for free pickup · shipping promotion (off).

## Notifications

- **Channels table** `notification_channels`: type (`telegram` | `email`), destination (chat ID or address), subscribed events, active. Adding a recipient is adding a row from the panel; no code change.
- **Events:** proof uploaded, new custom request, QR about to expire.
- **Flow:** DB trigger/webhook → Edge Function `notify` → each active channel subscribed to the event.
- **To the customer:** buttons in the panel that open WhatsApp with prefilled messages (confirmed, ready for pickup, shipping receipt, proof rejected).
- WhatsApp Business API is out of scope (paid).

## AI (later, optional)

- Added as a step inside `notify`, using a vision model through OpenRouter (the owner has credits).
- Reads amount, date, recipient, transaction number and reference from the proof; flags mismatches and reused transaction numbers.
- Only adds information to the alert. **A human always confirms the payment** in the bank app.
- The OpenRouter key is an Edge Function secret.

## Policies

No returns · bus shipping is paid by the customer · pickup Bs 2 with extra charge after 1 week · QR payments are validated within the published hours.

## Out of the MVP

Payment gateway, invoicing, WhatsApp Business API, AI payment check (until enabled), custom backend API, reviews, coupons, advanced analytics, seasonal or time-limited discounts on the website (future).

## Build order

1. ~~Base project~~ (done)
2. ~~Supabase schema: migrations, RLS, audit triggers, atomic reservation (RPC)~~ (done)
3. ~~Catalog, product, size guide (with Open Graph)~~ (done)
4. ~~Cart + WhatsApp order~~ (done)
5. ~~Admin panel: products, quick sale, orders, settings, audit log~~ (done)
6. Full QR checkout
7. Notifications: `notify` Edge Function + `notification_channels`
8. Account, my pets, custom requests
9. Home: featured products and categories
10. Keep-alive job, domain and launch
11. (Optional) AI proof check with OpenRouter

## Current status

> Updated on 2026-11-20.

- Steps 1 to 6 are done in code. Step 7 (notifications) is next.
- The QA project has every migration up to `20261118000500`. Step 6 adds `20261120000100_qr_checkout` and `20261120000200_cancel_own_order`, which exist only locally. Push them only after asking the owner.
- Remote setup still pending for step 6: the Turnstile widget, the Supabase captcha, anonymous sign-ins and the `TURNSTILE_SITE_KEY` variable in Coolify (`docs/deploy.md`).

## QA environment

- Purpose: try the deployed site on real phones before launch. No real customers, orders or payments.
- Runs on the owner's VPS with Coolify, behind Cloudflare, on the launch domain (`<domain>` and `www`). How to deploy: `docs/deploy.md`.
- Uses its own free Supabase project (the QA project). It is deleted at launch and replaced by a new production project (step 10). The Docker image is the same; only the environment variables change.
- `NO_INDEX=true` the whole time: `robots.txt` disallows everything and every response carries `noindex`.
- Only test data. `supabase/seed.sql` is for the local stack and is never pushed. Products are added from the admin panel.
- Dashboard setup (done by the owner): Site URL and Redirect URLs, Google provider, the custom access token hook, and the admin row. Anonymous sign-ins are turned on together with Turnstile when step 6 is deployed.

## Decisions

> Recorded on 2026-10-26 while planning step 2. Where a decision differs from an earlier section, the decision wins.

### Stock and reservations

- `reserved_until` lives on the **order**, not on the variant, so a size with stock above 1 can be held by several orders at the same time.
- Available = variant stock minus the units held by active orders. An order holds stock while it is `pending_payment` with `reserved_until` in the future, or `proof_uploaded`.
- Stock goes down only when an order becomes `confirmed` (or when a quick sale is created). Cancelling a sold order puts the stock back.
- Every availability check locks the variant rows (`select ... for update`, always ordered by id) inside the same transaction that writes the order, so two orders can never take the same unique item.
- Expiry: expired `pending_payment` orders are cancelled lazily at the start of the order RPCs **and** by a `pg_cron` job every 5 minutes, so the admin list is always accurate.
- A user can have at most **one** active `pending_payment` order.

### Order flow

- **Rejected proof** → `cancelled` with a required reason; items released. The owner contacts the customer by WhatsApp. A rejection made by mistake is undone with restore.
- **Late proof** (reservation already expired): a payment is never lost.
  - If every item is still free, take the items again and move to `proof_uploaded`.
  - If any item is gone, still store the proof, move to `proof_uploaded` with a `needs_attention` flag and notify the owner, who resolves it by WhatsApp.
  - An item is never sold twice.
- **Restore** → back to the exact status before the cancellation. All items or nothing: if any item is no longer free, it fails and lists which ones.
- **Revert** into `pending_payment` → a fresh N-minute reservation window.
- **Quick sales** cannot be reverted below `confirmed`. To undo one, the owner cancels it with a reason.
- **Customers** can cancel their own order only while it is `pending_payment`. After the proof is uploaded, only admins can cancel. A customer cancellation uses the fixed reason `cancelled_by_customer`.
- **`needs_attention` orders hold no stock** (their items are already gone). `confirm_order` locks and checks again on them and fails listing the items that are not free. The flag is cleared automatically when the order is confirmed or cancelled.
- A late proof is accepted for an expired `pending_payment` order, or for a `cancelled` one only when the reason was `reservation_expired`. Orders cancelled by an admin or by the customer reject it.
- **Revert** uses a fixed backward map, not the history:
  - `proof_uploaded` → `pending_payment`
  - `confirmed` → `proof_uploaded` (web orders only)
  - `ready_for_pickup` / `shipped` → `confirmed`
  - `delivered` → `ready_for_pickup` or `shipped`, depending on the delivery method
- **Restore into `pending_payment`** gets a fresh reservation window, and fails if the customer already has another pending order.
- `order_items` stores snapshots of the unit price and the product name, so editing a product never changes past orders.
- Double-booking under real concurrency is tested by a script that opens two database sessions at once (`pnpm db:test:concurrency`), in addition to the pgTAP tests.

### Catalog

- Pet types, categories and sizes are tables the admin edits. Pet types are seeded with dog and cat.
- **Sizes** are configurable and use ranges in cm: `label` (text: `000`, `00`, `0`, `1`...), `sort_order` (int, because the labels cannot be sorted as text), `neck_min`/`neck_max`, `chest_min`/`chest_max`, `back_length_min`/`back_length_max`, `active`. Each min is at most its max; `label` and `sort_order` are unique.
- Sizes are seeded in a migration (business data needed in production; edited later from the admin panel):

  | label | neck  | chest | back length |
  | ----- | ----- | ----- | ----------- |
  | 000   | 17–20 | 25–29 | 15–19       |
  | 00    | 21–23 | 30–34 | 20–24       |
  | 0     | 24–26 | 35–39 | 25–29       |
  | 1     | 27–29 | 40–44 | 30–34       |
  | 2     | 30–32 | 45–49 | 35–39       |
  | 3     | 33–35 | 50–54 | 40–44       |
  | 4     | 36–38 | 55–59 | 45–49       |
  | 5     | 39–44 | 60–67 | 50–54       |
  | 6     | 45–49 | 68–75 | 55–59       |
  | 7     | 50–54 | 76–83 | 60–64       |

- The size table is only a **reference**. Each variant has a required `size_id` (for catalog filters) plus its **exact** measurements `neck_cm`, `chest_cm`, `back_length_cm` (numeric, nullable, greater than 0 when present).
- Exact measurements are those of the **pet** the item fits, so they compare directly with the customer's pet.
- Saving is not blocked when an exact measurement falls outside its size range; the admin UI warns instead (later step).

### For later steps

- **Product page:** shows "Talla X · Medidas de esta prenda: cuello, pecho, largo" when exact measurements exist.
- **Size calculator:**
  - Ranges have 1 cm gaps, so each range is treated as [min, next size's min).
  - Each measurement is matched on its own. The calculator recommends the **largest** match and shows a note if the matches differ.
  - Outside every size → suggest a custom request.
  - If the item has exact measurements, compare against those instead of the table (details in "Step 3" below).

### Delivery and pricing

- The Bs 2 pickup fee is **not** in the QR total (paid at pickup). "Free from 3 items" counts the total quantity in the order. Both values come from settings.
- **Shipping promotion:** when on, if the order reaches X items **or** Bs X total (both in settings), CutePet pays the bus parcel fee. The order stores a snapshot (`shipping_paid_by_store`) so later setting changes do not alter past orders.

### Security

- Cloudflare Turnstile protects anonymous sign-in (step 6). The site key is the public `TURNSTILE_SITE_KEY` variable; the secret lives only in the Supabase captcha setting.
- Dependency security: `pnpm-workspace.yaml` only allows install scripts for the packages listed in `allowBuilds` and enforces `trustPolicy: no-downgrade`. No exceptions are added without asking the owner.

### Hosting

- Hosting the SSR app is handled by the owner: a Docker image on the owner's VPS with Coolify, behind Cloudflare (`docs/deploy.md`). Only the domain is paid.
- Configuration is read from environment variables when the server starts (`SITE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `TURNSTILE_SITE_KEY`, `NG_ALLOWED_HOSTS`, `NO_INDEX`), so one image serves QA and production. The browser gets them from `/runtime-config.js`, so they must never include a secret.
- Angular SSR answers only the hosts in `NG_ALLOWED_HOSTS`, so that variable must list the production domain (and `www` if used).
- The free Supabase project pauses after a week without activity. A free scheduled job (e.g. a GitHub Action) queries it daily to keep it alive (step 10).

### Scope and workflow of step 2

- `pets`, `custom_requests` and `notification_channels` are left for their steps (7 and 8). The `settings` table is included now.
- Development uses the local Supabase stack (`supabase start` / `supabase db reset`) with pgTAP tests for RLS and every RPC rule (double-booking, restore conflicts, permissions).
- The remote Supabase project is never touched without asking the owner first.

### Step 3: catalog, product page and size guide

> Recorded on 2026-10-26 while planning step 3, and revised the same day: ready-made items only, no sold gallery, mobile first. Calculator, price format and card style revised on 2026-10-27.

**Ready-made only.** Made to order was removed completely by new migrations: the product availability type and lead days, the `in_production` status, the made-to-order snapshot on `order_items`, and the RPC branches. Postgres cannot drop an enum value, so `order_status` was replaced by a new type (there was no production data).

**Catalog status.** A `security_invoker` view `public.catalog_products` computes, per product, `catalog_status` (`available`, `reserved`, `sold_out`, declared in display order) and the sizes that still have stock. Products with no variants are left out.

- **Reserved** (stock above 0 but every unit held by an active order) stays in the catalog, sorted after the available items.
  - Card: slightly faded photo and a soft badge "Alguien la está comprando".
  - Product page: "Alguien está comprando esta prenda. Si no completa su compra, volverá a estar disponible en unos minutos." Size selection is disabled.
- **Sold out** is hidden from customers: not in the catalog, the filters or the size options. The admin still sees it.
- There is no sold gallery.

**Sold-out product page.** An old link shows a friendly page "Esta prenda ya no está disponible" with buttons to the catalog and `/personalizado`, without the product details, marked `noindex`. Inactive or unknown products answer 404.

**Catalog filters.**

- Mascota, Categoría and Talla. One choice per filter, no sorting, no pagination.
- Active filters live in Spanish query params (`/catalogo?mascota=gato&categoria=abrigos`) so filtered links can be shared on WhatsApp.
- The category filter lists only active categories with at least one product shown in the catalog, reserved ones included (confirmed by the owner on 2026-10-27).
- Categories are seeded in a migration: Abrigos, Vestidos, Otros. The admin adds, renames or deactivates them later; a category used by products is deactivated, never deleted.

**Mobile first.** Most customers arrive from WhatsApp on a phone. Pages are designed at 360px first and checked at 360, 768 and 1280px.

- Header on mobile: logo left, cart icon always visible right, menu button that opens a side navigation with the links. Desktop keeps the inline links.
- Filters on mobile: a "Filtros" button that opens a bottom sheet; active filters are shown as removable chips. Desktop keeps the inline row.
- Product grid: 2 columns on mobile, 3 on tablet, 4 on desktop.
- No horizontal overflow at any width, and `scrollbar-gutter: stable` so the layout does not shift when the scrollbar appears.

**Size guide** is rendered on the server (not prerendered) because the size table is edited from the admin panel.

**Size calculator.**

- Back length is required (from the owner's sales experience, it decides the fit); chest and neck are optional. With fewer than three measurements the result says it is approximate.
- **Size guide (table mode):** each range is [min, next size's min); the last size uses [min, max + 1). Each measurement is matched on its own, the largest match is recommended, and a note appears if the matches differ. Outside every size → suggest a custom request.
- **Product page (exact mode):** exact measurements are those of the pet the item fits, so the pet is compared with them, never with the size table (some items are made for broad-chested breeds and differ a lot from their range). The calculator recommends among that product's variants.
  - A measurement fits when |pet − item| ≤ tolerance.
  - Tolerance: global setting `settings.size_tolerance_cm` (default 2 cm) plus an optional per-variant override `variants.tolerance_cm` (nullable, e.g. 4 cm for stretchy fabric). Null uses the global one.
  - "Le queda" when every measurement the customer entered fits; otherwise it says what is different, from the garment's point of view: "La prenda es 3 cm más corta de largo", "La prenda es 2 cm más ancha de pecho".
  - When no size fits within tolerance, it shows the closest one first ("La más cercana: Talla 0", the size whose differences add up to the fewest cm) and then the custom request link.
  - A variant without exact measurements falls back to its size range, as in table mode (confirmed by the owner on 2026-10-27).
- The admin can always save any size and measurements combination; the admin UI only warns, never blocks.

**Product page** shows the sizes that still have stock as a size selector (reserved sizes disabled) and, for the selected size, "Talla X · Medidas de esta prenda: cuello, pecho, largo" when exact measurements exist, listing only the ones present. A size without exact measurements shows its reference ranges instead ("Talla 4 · Medidas de referencia: cuello 36 a 38 cm, pecho 55 a 59 cm, largo 45 a 49 cm"), so the measurements never disappear when the customer switches sizes. "Agregar al carrito" is added in step 4.

**Price format.** "Bs 120" with a space, and no decimals when the price is whole ("Bs 120,50" otherwise). One shared helper formats every price, including link previews.

**Style.** Cards and panels use a thin, soft border (1px, chocolate at low opacity). Badges use palette tokens, never black.

**Content and assets.** Neutral placeholder images and a placeholder `og-image` until the owner provides real ones. The "Cómo medir" text is a first draft to be reviewed; illustrations are a placeholder.

**Local test data.** `supabase/seed.sql` plus placeholder photos uploaded to the local `store-images` bucket. Seed data never reaches production.

**For step 5 (admin panel):** compress product photos on upload. WhatsApp ignores link preview images above about 600 KB, while the bucket accepts up to 5 MB.

### Step 4: cart and WhatsApp order

> Recorded on 2026-10-28 while planning step 4.

**Product page.** "Agregar al carrito" is the only `.cp-cta` on the page and acts on the selected size. After adding, a snackbar "Agregado al carrito" offers "Ver carrito". When the selected size is already in the cart with no more units available, the button becomes a link "Ya está en tu carrito · Ver carrito". When every size is reserved it is disabled. Adding the same size again adds one unit, up to its available stock.

**One variant per size.** A product has at most one variant per size (unique product and size in the database). Identical pieces of the same model and size are one variant with stock above 1. If the owner makes the same model in the same size with different measurements, it is created as a separate product.

**Cart storage.** The cart lives in the browser (`localStorage`, key `cutepet.cart.v1`), not in the database: the anonymous user is only created for QR checkout. Each line stores the variant id, quantity, product name and size label. The price is never stored; price, photo, measurements and availability always come fresh from the database. The name and size label are kept only to say which piece was removed when the product is no longer visible. On the server the cart is empty; the browser restores it after hydration.

**Availability check.** When the cart opens (and with "Revisar de nuevo"), every line is checked against the database:

- No longer visible or no stock left → removed from the cart with the notice "Esta prenda ya fue vendida: <name> (Talla X)".
- Stock left but every unit held by an order → stays in the cart, faded, with "Alguien está comprando esta prenda. Si no completa su compra, volverá a estar disponible en unos minutos." It is left out of the totals and the WhatsApp message.
- Fewer units available than in the cart → the quantity is lowered, with "Solo queda N".

There is no quantity stepper while every piece is unique; a line can only be removed.

**Cart page.** Items, a delivery choice (pickup point in La Paz by default, or bus parcel shipping) and a summary. The total is the items only. The pickup rule comes from settings and is always shown: "Recojo en La Paz: Bs 2, gratis desde 3 prendas", or "Recojo en La Paz: gratis" once the cart reaches the threshold (counted in units). Bus parcel shipping says the customer pays it at the terminal, unless the shipping promotion applies (step 6). Only the delivery method is asked here; no name, phone or city.

**WhatsApp order.**

- Shown whenever `settings.store_whatsapp` is set; otherwise the cart says "Muy pronto podrás hacer tu pedido aquí". In step 4 it is the cart's `.cp-cta`. From step 6, QR checkout takes the `.cp-cta` when enabled and WhatsApp stays visible as a secondary button; when QR is off the cart also shows `qr_disabled_message`.
- An 8 digit `store_whatsapp` gets the `591` country code added when building the link (`https://wa.me/<digits>?text=<encodeURIComponent(message)>`). Step 5 validates the number in the settings form.
- The link is a plain link opened by the tap (no await before opening, so mobile browsers do not block it). Availability is checked when the cart opens; the owner still confirms in the chat and the quick sale RPC never sells an item twice.
- Message, with no order code (the owner records it later as a quick sale with its own code):

  ```
  ¡Hola CutePet! Quiero hacer este pedido desde la web:

  • Abrigo Osito Rosa · Talla 1 · cuello 28, pecho 42, largo 32 cm · Bs 120 · <product link>
  • 2 x Vestido Floral · Talla 0 · Bs 190 · <product link>

  Total: Bs 310 (3 prendas)
  Entrega: recojo en La Paz (gratis)

  ¿Me confirmas para hacer el pago?
  ```

  - Each line identifies the exact piece: name, size, exact measurements (only those present; omitted when the variant has none), price and product link. "2 x" and the line subtotal only when the quantity is above 1.
  - Delivery line: "recojo en La Paz (Bs 2 al recoger)", "recojo en La Paz (gratis)" or "envío por flota a otro departamento (el envío lo pago en la terminal)".

- After the tap the cart shows "Te abrimos WhatsApp con tu pedido. Cuando lo envíes, te responderemos para coordinar el pago y la entrega." with "Ya lo envié, vaciar carrito" and "Volver al carrito". The cart is never emptied automatically.

**Header.** The cart icon shows a badge with the number of units in the cart, hidden when empty; its label is "Ver carrito, N prendas" (the visible number must appear as its own word in the label, or AXE flags it). It needs no database call.

### Step 5: admin panel

> Recorded on 2026-11-17 while planning step 5.

**Who uses it.** The owner and her helpers, mostly from a phone. Every admin page is designed at 360px first. Helpers have the same `admin` role as the owner; the audit log shows who did what.

**Slices.** Built and committed one at a time, each with `pnpm check` passing: (1) admin login and layout, (2) products, sizes and stock adjustment, (3) product photos, (4) quick sale, (5) settings, (6) orders with timeline, WhatsApp buttons and shipping receipt, (7) audit log, (8) categories, pet types and sizes.

**Routes.** `/admin/ingresar` (Google sign-in, no guard), `/admin/pedidos`, `/admin/pedidos/:code`, `/admin/venta-rapida`, `/admin/prendas`, `/admin/prendas/nueva`, `/admin/prendas/:id`, `/admin/configuracion`, `/admin/historial`. `/admin` opens the orders list. A signed-in user without the admin role sees "Tu cuenta no tiene acceso al panel".

**Products.**

- Archiving is `is_active = false` and can be undone. Orders in progress continue; new sales of an archived product are refused.
- The slug is generated from the name when the product is created and then locked. "Cambiar enlace" changes it with a warning that shared links stop working.
- A product is created first (data only); sizes and photos are added on its edit page. A product with no variants is not shown in the catalog.
- A variant's `size_id` can be changed only while the variant has no orders (enforced in the database). Otherwise its stock goes to 0 with a reason and a new variant is created. Variants are never deleted.
- Exact measurements outside the size range [min, max] of the table show a warning, never a block.
- Removing a photo deletes both the row and the file in storage.
- Photos are compressed in the browser before upload (no dependency): longest side 1600px, JPEG, quality lowered until the file is about 550 KB or less, so link previews stay under WhatsApp's 600 KB limit. Re-encoding also drops EXIF data (phone location).
- `is_featured` is edited in step 9.

**Quick sale.** Price is never editable; it always comes from the product.

**Settings.**

- `store_whatsapp`: 8 digits starting with 6 or 7. The `wa.me` link adds `591`.
- The QR expiry date is required when QR checkout is on. A warning "vence en X días" appears from 7 days before. In step 6 an expired QR turns QR checkout off automatically.
- The QR image is uploaded without lossy compression so it stays scannable.
- The admin form reads the whole `settings` row for editing; the shared settings reader of step 6 is still extracted then.

**Orders.**

- Each order shows its timeline (who, when, from which status to which, why) from the audit log. The actor is the admin's Google name or email, "Cliente" for the order's customer and "Sistema" when there is no actor (expiry job).
- A rejected proof is `cancel_order` with a reason; the "comprobante rechazado" message is offered for orders cancelled from `proof_uploaded`.
- Shipping receipt: only for bus parcel orders (enforced in the database). The admin uploads it to the order as a record and attaches the photo by hand in WhatsApp; no link is sent.
- Marking an order "Enviado" without a receipt is allowed, with a warning.
- The order list opens on "Por revisar" (orders in `proof_uploaded`, the `needs_attention` ones first); other statuses are a filter, and a search by code, name or phone looks in every status.
- Payment proofs and shipping receipts live in private buckets and are shown only through signed links that expire after 5 minutes.
- The shipping receipt photo is compressed like product photos. A replaced receipt stays in storage on purpose: it is evidence of what was sent, and nothing is deleted (admins can upload receipts but not delete them). The audit log keeps the previous path.
- Confirm and advance ask for confirmation; cancel, reject, revert and restore also ask for the reason.

**WhatsApp messages to the customer** (draft, reviewed by the owner):

- Confirmado:

  ```
  ¡Hola {nombre}! Recibimos tu pago del pedido {código} por Bs {total}. ¡Gracias por tu compra! 🐾
  [recojo] Te avisamos cuando esté listo para recoger.
  [flota] Te enviaremos la guía cuando lo despachemos.
  ```

- Listo para recoger:

  ```
  ¡Hola {nombre}! Tu pedido {código} ya está listo para recoger.
  📍 {dirección}
  🕒 {horario}
  Recojo: {Bs 2 al recoger | gratis}
  {aviso del punto de recojo}
  ```

- Guía de envío:

  ```
  ¡Hola {nombre}! Tu pedido {código} ya fue enviado por flota a {ciudad}. Te mando la foto de la guía.
  [no pagado por la tienda] Recuerda que el envío se paga al recoger en la terminal.
  [pagado por la tienda] El envío ya está pagado por CutePet.
  ```

- Comprobante rechazado:

  ```
  Hola {nombre}, revisamos el comprobante de tu pedido {código} y no pudimos confirmar el pago: {motivo}. ¿Nos ayudas a revisarlo? Si ya hiciste la transferencia, envíanos la captura por aquí y lo vemos juntos.
  ```

**Audit log.** Read only, no export. Filters by entity and date. The timeline and the audit page share one admin-only RPC that returns the actor label, because the admin cannot read `auth.users`.

**Categories, pet types and sizes.** Added, edited, deactivated and activated again from `/admin/categorias-y-tallas`; never deleted.

- Deactivating does not change existing products: they stay on sale with that category, pet type or size. For that, everyone can read inactive rows (public catalog data); the store asks for active ones only where it builds the catalog filters, the size guide and the options of the product form. The product page reads every size, so a product with a deactivated size keeps its reference measurements.
- Before deactivating, the panel warns how many published products use it ("3 prendas usan esta categoría"). It warns, never blocks.
- A new category or pet type gets its slug from the name; the slug does not change when it is renamed, so filtered links keep working.
- Sizes: `label` and `sort_order` are unique and each min is at most its max. Editing a range changes the size guide and the calculator, and the dialog says so.

**Anonymous users.** Anonymous sign-ins are off on the remote project until step 6, which turns them on together with Turnstile and checks that RLS and RPCs exclude anonymous users (`is_anonymous` claim) where needed.

**Local admin user.**

1. One Google OAuth client (Web, Testing mode) with the redirect URIs `http://127.0.0.1:54321/auth/v1/callback` (local) and `https://<ref>.supabase.co/auth/v1/callback` (remote). Its ID and secret go in `supabase/.env` (gitignored) as `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`.
2. Restart the local stack, open `/admin/ingresar` and sign in with Google once.
3. Give that user the admin role in the local database:

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = '<your email>';
   ```

4. Sign out and in again so the token carries the role.

Apply new migrations with `supabase migration up`, which keeps `auth.users` and the admin row. Use `supabase db reset` only for a clean start; it deletes the users, so steps 2 to 4 must be repeated.

**Remote project.** Migrations are pushed only when step 5 is done and `pnpm check` passes, after asking the owner. The owner configures the Google provider in the dashboard.

### Step 6: QR checkout

> Recorded on 2026-11-20.

- **One settings reader:** `core/settings` reads the public columns once and maps them to `StoreSettings`, including `qrCheckoutAvailable` (on, with an image, and not past its expiry date in La Paz time). The cart, the catalog tolerance, quick sale, the admin order page and checkout all use it. The settings form keeps its own full read because it edits the row.
- **Shared customer rules:** `core/orders/customer-details` has the delivery type and labels, the phone pattern and the Signal Forms schema used by quick sale and QR checkout.
- **Expired QR:** a daily pg_cron job (00:05 La Paz) turns QR checkout off with the audit reason `qr_expired`, and `reserve_order` also refuses an expired QR or a missing image.
- **Cart:** with QR available, "Pagar con QR" is the `.cp-cta` and WhatsApp is secondary. Below 768px the total and the main button sit in a fixed bottom bar. The delivery choice is kept in memory for the visit, never stored. "El costo de la entrega no está incluido en el total." appears only when delivery costs the customer something.
- **Shipping promotion:** shown only when it is on. The cart, the form, the confirmation and the WhatsApp message say when CutePet pays the bus parcel.
- **Form inside `/carrito`:** name, phone and the bus parcel fields. Name and phone are not remembered. The guest session is created only when the customer reserves, after the Turnstile check, and only if there is no session yet.
- **Conflicts:** a reserved piece is explained in its own row; the page scrolls to it and announces it through a polite live region.
- **Payment screen `/pagar/:code`:** exact amount, the code to type in the glosa with a copy button, the QR with "Descargar QR" as the `.cp-cta`, the countdown, validation hours, proof upload and "Cancelar pedido". The countdown starts from the `seconds_left` the server sends and asks the server again at 0 and when the tab becomes visible. `/pagar` without a code opens the latest pending or expired order.
- **Proof files:** images over 5 MB are compressed in the browser; PDFs over 5 MB and other types are rejected with a message.
- **Expired reservation:** "Tu reserva venció" offers "Ya pagué, subir comprobante" (a late proof, always accepted for the latest expired order) and "Volver a intentarlo".
- **Confirmation:** the pickup address, hours, `pickup_notice` and fee, or the bus parcel destination, the promise of the shipping receipt by WhatsApp and who pays it. A `needs_attention` order only says: "Recibimos tu comprobante 🐾. Una de las prendas ya no estaba disponible, así que te escribiremos por WhatsApp para resolverlo." After the proof, the ordered pieces are removed from the cart.
- **Coming back:** when a session already exists, the cart asks `my_checkout_order()` and shows "Tienes un pago pendiente: CODE · Continuar" for an order still on time. Pieces held by that order read "Está reservada en tu pago pendiente." instead of the note about someone else. Another device or cleared browser data means contacting the store by WhatsApp; finding orders by link is step 8.
- **Admins buying in the store** cancel their own order without a reason, like any customer. The admin panel always sends a reason, so it keeps the admin rules.
- **Anonymous users** have the `authenticated` role. Nothing in step 6 needs to block them; pgTAP tests show they reach only their own orders and proofs. `is_anonymous` restrictions belong to step 8.

### Step 10: launch checklist

Commands and dashboard paths are in `docs/deploy.md`.

1. Delete the QA Supabase project.
2. Create the production project (free plan, region closest to Bolivia, e.g. São Paulo).
3. Push the migrations to it (`supabase link`, dry run, `supabase db push`, `supabase migration list`). Never with `--include-seed`.
4. Google provider: in Google Cloud, add the redirect URI `https://<new-ref>.supabase.co/auth/v1/callback` to the OAuth client and remove the QA one. Publish the consent screen (Testing mode only lets listed test users sign in). Then enable Google in the Supabase dashboard with the client ID and secret.
5. Authentication → Hooks: enable the custom access token hook with `public.custom_access_token_hook`.
6. Turn on anonymous sign-ins together with Turnstile (Authentication → Attack Protection → CAPTCHA), as built in step 6.
7. The owner signs in with Google once, then add the admin row (`insert into public.user_roles ...`, see "Local admin user") and sign out and in again.
8. Authentication → URL Configuration: Site URL `https://<domain>`, Redirect URLs `https://<domain>/**` and `https://www.<domain>/**`.
9. Coolify: set the new `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (and `SITE_URL` and `NG_ALLOWED_HOSTS` if the domain changes), then redeploy.
10. Turn noindex off: `NO_INDEX=false`, redeploy, and check that `/robots.txt` allows everything and responses have no `x-robots-tag`.
11. Point the keep-alive job to the production project.
12. Upload product photos from the owner's phone (gallery and camera) on the deployed site.
