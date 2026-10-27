# CutePet — MVP specification

> Business source of truth. If the code contradicts this document, ask before changing either.
> Customer-facing text is Spanish; Spanish terms are kept in quotes where they matter.

## Summary

Online store for handmade pet clothing based in La Paz, Bolivia. Customers buy in two ways: paying with a bank QR code and uploading the payment proof, or sending the order through WhatsApp.

- Informal, early-stage business (Bs 200 to Bs 2,000 per month). Payments go to a personal bank account through Bolivia's interoperable QR ("QR Simple"); there is no payment gateway.
- 95% of sales are ready-made items. Today every model is unique (stock 1), but the system tracks stock per size.
- Low volume. The owner validates payments manually.
- **Zero cost:** only the domain is paid. Supabase free plan; the owner hosts the site on her own server.
- Principle: minimal for the customer; nothing is deleted, everything can be corrected, everything is audited.

## Stack

| Layer         | Choice                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Frontend      | Angular 22 (signals, zoneless) + Angular Material 3, pnpm                                             |
| Rendering     | Angular SSR (Node/Express). Hosting is handled by the owner                                           |
| Backend       | Supabase free: Postgres + RLS, Auth (anonymous), Storage, Edge Functions                              |
| Notifications | Edge Function `notify` → Telegram and email (multiple recipients)                                     |
| AI            | Out of the MVP. Later: OpenRouter vision model inside `notify`                                        |
| Keep-alive    | Free scheduled job (e.g. GitHub Action) that queries Supabase daily so the free project is not paused |

## Roles and audit

- **Guest:** Supabase anonymous user, created only when a QR checkout starts (not on every visit).
- **Customer with account:** order history and "Mis mascotas" (my pets) with saved measurements.
- **Admin:** owner and helpers. The role travels in the JWT (`app_metadata.role`), set by a custom access token hook.
- **Audit log:** Postgres triggers record who, when, entity, old value, new value and reason. Cancel, restore, reject proof, revert status and stock adjustment require a reason.

## Pages

| Route             | Page                                                     | Render    |
| ----------------- | -------------------------------------------------------- | --------- |
| `/`               | Home: hero photo, categories, featured products          | Server    |
| `/catalogo`       | Grid with filters (pet type, size, availability)         | Server    |
| `/catalogo/:slug` | Product: photos, size, "¿Cuál es su talla?", add to cart | Server    |
| `/carrito`        | Summary + "Pagar con QR" / "Pedir por WhatsApp"          | Client    |
| `/pagar`          | QR, amount, order code, countdown, upload proof          | Client    |
| `/guia-de-tallas` | How to measure + size table + size calculator            | Server    |
| `/personalizado`  | Custom request form                                      | Prerender |
| `/vendidos`       | Sold gallery                                             | Server    |
| `/mi-cuenta`      | Orders, order status by link, my pets                    | Client    |
| `/admin`          | Admin panel                                              | Client    |

"Server" pages must set Open Graph tags (image, name, price) for WhatsApp link previews.

## Catalog and stock

- **Product:** name, slug, description, pet type, category, photos, price (BOB), availability (in stock / made to order with days), active.
- **Variant:** size, measurements (neck, chest, back length in cm), stock, `reserved_until` (internal; the customer never fills it).
- **Available** = stock not sold and no active reservation. Computed on read; no cleanup job.
- **Sold out** = hidden from the catalog and shown in the sold gallery.

## Purchase flows

**QR checkout ("Pagar con QR")** — can be switched off from the panel

1. Name and phone are required (8 digits, starts with 6 or 7) + delivery method.
2. Order created as `pending_payment`; atomic reservation for N minutes (configurable, default 15).
3. Payment screen: QR, exact amount, order code to type in the transfer reference ("glosa"), validation hours.
4. Customer uploads the payment proof (private bucket) → `proof_uploaded`; the items stay locked with no expiry.
5. `notify` alerts every active notification channel. The admin checks the bank app and confirms or rejects.
6. Reservation expires without a proof → automatic cancellation and stock released.

**WhatsApp order ("Pedir por WhatsApp"):** `wa.me` link with the order prefilled (code, items, sizes, total).

**Quick sale (admin):** every sale made through WhatsApp is recorded as an **order with channel `whatsapp`**, directly in `confirmed` (pick items, name, phone, delivery). Stock is never lowered by hand to record a sale.

**Stock adjustment (admin):** only for corrections (damaged item, data entry error), with a required reason; audited.

**Conflicts:** item already sold → "Esta prenda ya fue vendida" and it is removed from the cart; reserved by someone else → "Alguien está pagando esta prenda, vuelve a intentarlo en unos minutos".

## Order statuses

`pending_payment` → `proof_uploaded` → `confirmed` → (`in_production`) → `ready_for_pickup` | `shipped` → `delivered`; `cancelled` from any status before delivery.

| Status             | UI label (es)      | Stock                  |
| ------------------ | ------------------ | ---------------------- |
| `pending_payment`  | Pendiente de pago  | Reserved for N minutes |
| `proof_uploaded`   | Comprobante subido | Locked, no expiry      |
| `confirmed`        | Confirmado         | Sold                   |
| `in_production`    | En confección      | Sold                   |
| `ready_for_pickup` | Listo para recoger | Sold                   |
| `shipped`          | Enviado            | Sold                   |
| `delivered`        | Entregado          | Sold                   |
| `cancelled`        | Cancelado          | Released               |

- `in_production` only for made-to-order or custom requests.
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

Payment gateway, invoicing, WhatsApp Business API, AI payment check (until enabled), custom backend API, reviews, coupons, advanced analytics.

## Build order

1. ~~Base project~~ (done)
2. ~~Supabase schema: migrations, RLS, audit triggers, atomic reservation (RPC)~~ (done)
3. Catalog, product, size guide, sold gallery (with Open Graph)
4. Cart + WhatsApp order
5. Admin panel: products, quick sale, orders, settings, audit log
6. Full QR checkout
7. Notifications: `notify` Edge Function + `notification_channels`
8. Account, my pets, custom requests
9. Home: featured products and categories
10. Keep-alive job, domain and launch
11. (Optional) AI proof check with OpenRouter

## Decisions

> Recorded on 2026-10-26 while planning step 2. Where a decision differs from an earlier section, the decision wins.

### Stock and reservations

- `reserved_until` lives on the **order**, not on the variant, so a size with stock above 1 can be held by several orders at the same time.
- Available = variant stock minus the units held by active orders. An order holds stock while it is `pending_payment` with `reserved_until` in the future, or `proof_uploaded`.
- Stock goes down only when an order becomes `confirmed` (or when a quick sale is created). Cancelling a sold order puts the stock back.
- Every availability check locks the variant rows (`select ... for update`, always ordered by id) inside the same transaction that writes the order, so two orders can never take the same unique item.
- Expiry: expired `pending_payment` orders are cancelled lazily at the start of the order RPCs **and** by a `pg_cron` job every 5 minutes, so the admin list is always accurate.
- Made-to-order variants skip the stock check and the reservation. Their orders go through `in_production`.
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
  - `in_production` → `confirmed`
  - `ready_for_pickup` / `shipped` → `in_production` if the order has made-to-order items, otherwise `confirmed`
  - `delivered` → `ready_for_pickup` or `shipped`, depending on the delivery method
- **Restore into `pending_payment`** gets a fresh reservation window, and fails if the customer already has another pending order.
- `order_items` stores snapshots of the unit price, the product name and whether the item is made to order, so editing a product never changes past orders.
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

- Cloudflare Turnstile protects anonymous sign-in. Implemented in step 6 (QR checkout); nothing in the schema.

### Scope and workflow of step 2

- `pets`, `custom_requests` and `notification_channels` are left for their steps (7 and 8). The `settings` table is included now.
- Development uses the local Supabase stack (`supabase start` / `supabase db reset`) with pgTAP tests for RLS and every RPC rule (double-booking, restore conflicts, permissions).
- The remote Supabase project is never touched without asking the owner first.

### Step 3: catalog, product page, size guide and sold gallery

> Recorded on 2026-10-26 while planning step 3.

**Catalog status.** A `security_invoker` view `public.catalog_products` computes, per product, `catalog_status` (`made_to_order`, `available`, `reserved`, `sold_out`) and the sizes that can be picked. Products with no variants are left out.

- **Reserved** items (stock above 0 but every unit held by an active order) stay in the catalog with a "Reservada" badge; the reserved size is disabled.
- **Made to order:** badge "Hecha a pedido · lista en X días", every size the product has is selectable, it matches the size filter, and it is never sold out.

**Sold gallery (`/vendidos`).**

- Shows in-stock products where every variant has stock 0. Made-to-order products never appear. A product with one size still available stays in the catalog.
- Newest product first. The price is hidden. Cards link to the product page.

**Sold-out product page.** Answers 200 with "Esta prenda ya fue vendida" and a "Pide una parecida" button to `/personalizado`. Photos, sizes and exact measurements stay visible, because customers use them to ask for a similar item. Inactive or unknown products answer 404.

**Catalog filters.**

- Pet type, category, size and availability. One choice per filter, no sorting, no pagination.
- Active filters live in Spanish query params (`/catalogo?mascota=gato&categoria=abrigos`) so filtered links can be shared on WhatsApp.
- The category filter lists only active categories with at least one product shown in the catalog (not sold out).
- Categories are seeded in a migration: Abrigos, Vestidos, Otros. The admin adds, renames or deactivates them later; a category used by products is deactivated, never deleted.

**Size guide** is rendered on the server (not prerendered) because the size table is edited from the admin panel.

**Size calculator.**

- Chest is required; neck and back length are optional. With fewer than three measurements the result says it is approximate.
- **Size guide (table mode):** each range is [min, next size's min); the last size uses [min, max + 1). Each measurement is matched on its own, the largest match is recommended, and a note appears if the matches differ. Outside every size → suggest a custom request.
- **Product page (exact mode):** exact measurements are those of the pet the item fits, so the pet is compared with them, never with the size table (some items are made for broad-chested breeds and differ a lot from their range). The calculator recommends among that product's variants.
  - A measurement fits when |pet − item| ≤ tolerance.
  - Tolerance: global setting `settings.size_tolerance_cm` (default 2 cm) plus an optional per-variant override `variants.tolerance_cm` (nullable, e.g. 4 cm for stretchy fabric). Null uses the global one.
  - "Le queda" when every measurement the customer entered fits; otherwise it says which one is off and by how much (e.g. "el largo es 3 cm más corto").
  - A variant without exact measurements falls back to its size range, as in table mode.
- The admin can always save any size and measurements combination; the admin UI only warns, never blocks.

**Product page** shows "Talla X · Medidas de esta prenda: cuello, pecho, largo" when exact measurements exist, listing only the ones present. "Agregar al carrito" is added in step 4.

**Content and assets.** Neutral placeholder images and a placeholder `og-image` until the owner provides real ones. The "Cómo medir" text is a first draft to be reviewed; illustrations are a placeholder.

**Local test data.** `supabase/seed.sql` plus placeholder photos uploaded to the local `store-images` bucket. Seed data never reaches production.

**For step 5 (admin panel):** compress product photos on upload. WhatsApp ignores link preview images above about 600 KB, while the bucket accepts up to 5 MB.
