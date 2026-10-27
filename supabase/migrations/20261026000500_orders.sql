create sequence public.order_code_seq start with 10001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default 'CP' || nextval('public.order_code_seq'),
  customer_id uuid references auth.users (id) on delete set null,
  channel public.order_channel not null,
  status public.order_status not null,
  status_before_cancel public.order_status,
  cancel_reason text,
  needs_attention boolean not null default false,
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  customer_phone text not null check (customer_phone ~ '^[67][0-9]{7}$'),
  delivery_method public.delivery_method not null,
  destination_city text check (char_length(destination_city) <= 80),
  recipient_name text check (char_length(recipient_name) <= 80),
  recipient_id_number text check (char_length(recipient_id_number) <= 20),
  items_total numeric(10, 2) not null check (items_total >= 0),
  pickup_fee numeric(10, 2) not null default 0 check (pickup_fee >= 0),
  shipping_paid_by_store boolean not null default false,
  reserved_until timestamptz,
  payment_proof_path text,
  shipping_receipt_path text,
  created_at timestamptz not null default now(),
  constraint orders_bus_parcel_data check (
    delivery_method = 'pickup_point'
    or (destination_city is not null and recipient_name is not null)
  ),
  constraint orders_pending_has_reservation check (
    status <> 'pending_payment' or reserved_until is not null
  ),
  constraint orders_cancel_data check (
    (status = 'cancelled') = (status_before_cancel is not null and cancel_reason is not null)
  )
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_status_created_at_idx on public.orders (status, created_at desc);
create unique index orders_one_pending_per_customer on public.orders (customer_id)
  where status = 'pending_payment';
create index orders_pending_reserved_until_idx on public.orders (reserved_until)
  where status = 'pending_payment';

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id),
  variant_id bigint not null references public.variants (id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price > 0),
  product_name text not null,
  is_made_to_order boolean not null,
  unique (order_id, variant_id)
);

create index order_items_variant_id_idx on public.order_items (variant_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.orders, public.order_items from anon, authenticated;
grant select on public.orders, public.order_items to authenticated;
grant update (shipping_receipt_path) on public.orders to authenticated;
revoke all on sequence public.order_code_seq from anon, authenticated;

create policy "owner or admin reads orders" on public.orders
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_admin()));
create policy "admin updates orders" on public.orders
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "owner or admin reads order items" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
