-- CutePet sells only ready made items. This removes made to order products and the in_production status.
-- The catalog view and its status type depend on products.availability, so they are rebuilt at the end.

drop view public.catalog_products;
drop type public.catalog_status;

drop function private.has_made_to_order_items(uuid);
drop function private.next_status(public.orders);
drop function private.previous_status(public.orders);
drop function private.is_sold_status(public.order_status);
drop function private.create_order(
  public.order_channel, public.order_status, uuid, jsonb, text, text,
  public.delivery_method, text, text, text
);

-- Postgres cannot drop an enum value, so the type is replaced.
-- Partial indexes and checks that compare status with a literal are recreated for the new type.
drop index public.orders_one_pending_per_customer;
drop index public.orders_pending_reserved_until_idx;
alter table public.orders
  drop constraint orders_pending_has_reservation,
  drop constraint orders_cancel_data;

alter type public.order_status rename to order_status_old;

create type public.order_status as enum (
  'pending_payment',
  'proof_uploaded',
  'confirmed',
  'ready_for_pickup',
  'shipped',
  'delivered',
  'cancelled'
);

alter table public.orders
  alter column status type public.order_status
    using (case when status = 'in_production' then 'confirmed' else status::text end)::public.order_status,
  alter column status_before_cancel type public.order_status
    using (case when status_before_cancel = 'in_production' then 'confirmed'
      else status_before_cancel::text end)::public.order_status;

drop type public.order_status_old;

alter table public.orders
  add constraint orders_pending_has_reservation check (
    status <> 'pending_payment' or reserved_until is not null
  ),
  add constraint orders_cancel_data check (
    (status = 'cancelled') = (status_before_cancel is not null and cancel_reason is not null)
  );

create unique index orders_one_pending_per_customer on public.orders (customer_id)
  where status = 'pending_payment';
create index orders_pending_reserved_until_idx on public.orders (reserved_until)
  where status = 'pending_payment';

alter table public.order_items drop column is_made_to_order;

alter table public.products
  drop constraint products_production_days_required,
  drop column availability,
  drop column production_days;

drop type public.availability;

create or replace function private.order_stock_items(target_order_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('variant_id', oi.variant_id, 'quantity', oi.quantity)),
    '[]'::jsonb
  )
  from public.order_items oi
  where oi.order_id = target_order_id;
$$;

create or replace function private.held_quantity(target_variant_id bigint, ignored_order_id uuid default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(oi.quantity), 0)::integer
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.variant_id = target_variant_id
    and not o.needs_attention
    and o.id is distinct from ignored_order_id
    and (
      o.status = 'proof_uploaded'
      or (o.status = 'pending_payment' and o.reserved_until > now())
    );
$$;

create or replace function private.unavailable_items(items jsonb, ignored_order_id uuid default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  missing_ids bigint[];
  sold_ids bigint[];
  reserved_ids bigint[];
begin
  perform private.lock_variants(array(select r.variant_id from private.parse_items(items) r));

  with checked as (
    select
      r.variant_id,
      r.quantity,
      v.id is not null as found,
      v.stock,
      private.held_quantity(r.variant_id, ignored_order_id) as held
    from private.parse_items(items) r
    left join public.variants v on v.id = r.variant_id
  )
  select
    coalesce(array_agg(c.variant_id order by c.variant_id) filter (where not c.found), '{}'),
    coalesce(array_agg(c.variant_id order by c.variant_id)
      filter (where c.found and c.stock < c.quantity), '{}'),
    coalesce(array_agg(c.variant_id order by c.variant_id)
      filter (where c.found and c.stock >= c.quantity and c.stock - c.held < c.quantity), '{}')
  into missing_ids, sold_ids, reserved_ids
  from checked c;

  if cardinality(missing_ids) > 0 then
    perform private.raise_error('VARIANT_NOT_FOUND', jsonb_build_object('variant_ids', missing_ids));
  end if;

  if cardinality(sold_ids) = 0 and cardinality(reserved_ids) = 0 then
    return null;
  end if;

  return jsonb_build_object('sold', sold_ids, 'reserved', reserved_ids);
end;
$$;

create or replace function private.shift_order_stock(target_order_id uuid, units_sign integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform private.lock_variants(array(
    select oi.variant_id from public.order_items oi where oi.order_id = target_order_id
  ));

  update public.variants v
  set stock = v.stock + units_sign * oi.quantity
  from public.order_items oi
  where oi.order_id = target_order_id
    and v.id = oi.variant_id;
end;
$$;

create function private.is_sold_status(status public.order_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select status in ('confirmed', 'ready_for_pickup', 'shipped', 'delivered');
$$;

create function private.next_status(target public.orders)
returns public.order_status
language sql
stable
set search_path = ''
as $$
  select (case
    when target.status = 'confirmed' and target.delivery_method = 'pickup_point'
      then 'ready_for_pickup'
    when target.status = 'confirmed'
      then 'shipped'
    when target.status in ('ready_for_pickup', 'shipped')
      then 'delivered'
  end)::public.order_status;
$$;

create function private.previous_status(target public.orders)
returns public.order_status
language sql
stable
set search_path = ''
as $$
  select (case
    when target.status = 'proof_uploaded'
      then 'pending_payment'
    when target.status = 'confirmed' and target.channel = 'web'
      then 'proof_uploaded'
    when target.status in ('ready_for_pickup', 'shipped')
      then 'confirmed'
    when target.status = 'delivered' and target.delivery_method = 'pickup_point'
      then 'ready_for_pickup'
    when target.status = 'delivered'
      then 'shipped'
  end)::public.order_status;
$$;

create function private.create_order(
  order_channel public.order_channel,
  initial_status public.order_status,
  owner_id uuid,
  items jsonb,
  customer_name text,
  customer_phone text,
  delivery_method public.delivery_method,
  destination_city text,
  recipient_name text,
  recipient_id_number text
)
returns public.orders
language plpgsql
set search_path = ''
as $$
declare
  store public.settings;
  item_count integer;
  total numeric(10, 2);
  is_bus_parcel boolean := delivery_method = 'bus_parcel';
  created public.orders;
begin
  perform private.assert_valid_items(items);
  perform private.lock_and_check_variants(items);

  if exists (
    select 1 from private.parse_items(items) r
    join public.variants v on v.id = r.variant_id
    join public.products p on p.id = v.product_id
    where not p.is_active
  ) then
    perform private.raise_error('VARIANT_NOT_FOUND');
  end if;

  select * into store from public.settings;

  select sum(r.quantity), sum(r.quantity * p.price)
  into item_count, total
  from private.parse_items(items) r
  join public.variants v on v.id = r.variant_id
  join public.products p on p.id = v.product_id;

  insert into public.orders (
    customer_id, channel, status, customer_name, customer_phone, delivery_method,
    destination_city, recipient_name, recipient_id_number,
    items_total, pickup_fee, shipping_paid_by_store, reserved_until
  ) values (
    owner_id, order_channel, initial_status, trim(customer_name), customer_phone, delivery_method,
    case when is_bus_parcel then nullif(trim(destination_city), '') end,
    case when is_bus_parcel then nullif(trim(recipient_name), '') end,
    case when is_bus_parcel then nullif(trim(recipient_id_number), '') end,
    total,
    case when not is_bus_parcel and item_count < store.free_pickup_min_items then store.pickup_fee else 0 end,
    is_bus_parcel and store.shipping_promo_enabled and (
      coalesce(item_count >= store.shipping_promo_min_items, false)
      or coalesce(total >= store.shipping_promo_min_total, false)
    ),
    case when initial_status = 'pending_payment' then private.reservation_deadline() end
  )
  returning * into created;

  insert into public.order_items (order_id, variant_id, quantity, unit_price, product_name)
  select created.id, r.variant_id, r.quantity, p.price, p.name
  from private.parse_items(items) r
  join public.variants v on v.id = r.variant_id
  join public.products p on p.id = v.product_id;

  return created;
end;
$$;

create type public.catalog_status as enum ('available', 'reserved', 'sold_out');

-- catalog_status is declared in display order, so ordering by it lists available items first.
-- size_ids holds the sizes that still have stock, reserved or not, for the size filter.
create view public.catalog_products with (security_invoker = true) as
select
  p.id,
  p.name,
  p.slug,
  p.description,
  p.pet_type_id,
  p.category_id,
  p.price,
  p.is_featured,
  p.created_at,
  case
    when totals.available_units > 0 then 'available'
    when totals.stock_units > 0 then 'reserved'
    else 'sold_out'
  end::public.catalog_status as catalog_status,
  totals.size_ids
from public.products p
cross join lateral (
  select
    sum(cv.stock) as stock_units,
    sum(cv.available_stock) as available_units,
    coalesce(array_agg(cv.size_id order by cv.size_id) filter (where cv.stock > 0), '{}') as size_ids
  from public.catalog_variants cv
  where cv.product_id = p.id
) totals
where totals.stock_units is not null;

revoke all on public.catalog_products from anon, authenticated;
grant select on public.catalog_products to anon, authenticated;
