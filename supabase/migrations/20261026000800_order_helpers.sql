create function private.require_reason(reason text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  cleaned_reason text := nullif(trim(reason), '');
begin
  if cleaned_reason is null then
    perform private.raise_error('REASON_REQUIRED');
  end if;

  perform private.set_audit_reason(cleaned_reason);
  return cleaned_reason;
end;
$$;

create function private.reservation_deadline()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now() + make_interval(mins => s.reservation_minutes) from public.settings s;
$$;

create function private.has_made_to_order_items(target_order_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.order_items oi
    where oi.order_id = target_order_id and oi.is_made_to_order
  );
$$;

create function private.has_other_pending_order(target public.orders)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.customer_id = target.customer_id
      and o.id <> target.id
      and o.status = 'pending_payment'
  );
$$;

create function private.lock_order(target_order_id uuid)
returns public.orders
language plpgsql
set search_path = ''
as $$
declare
  target public.orders;
begin
  select * into target from public.orders o where o.id = target_order_id for update;

  if not found then
    perform private.raise_error('ORDER_NOT_FOUND');
  end if;

  return target;
end;
$$;

create function private.next_status(target public.orders)
returns public.order_status
language sql
stable
set search_path = ''
as $$
  select (case
    when target.status = 'confirmed' and private.has_made_to_order_items(target.id)
      then 'in_production'
    when target.status in ('confirmed', 'in_production') and target.delivery_method = 'pickup_point'
      then 'ready_for_pickup'
    when target.status in ('confirmed', 'in_production')
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
    when target.status = 'in_production'
      then 'confirmed'
    when target.status in ('ready_for_pickup', 'shipped') and private.has_made_to_order_items(target.id)
      then 'in_production'
    when target.status in ('ready_for_pickup', 'shipped')
      then 'confirmed'
    when target.status = 'delivered' and target.delivery_method = 'pickup_point'
      then 'ready_for_pickup'
    when target.status = 'delivered'
      then 'shipped'
  end)::public.order_status;
$$;

create function private.cancel_order_row(target public.orders, reason text)
returns public.orders
language plpgsql
set search_path = ''
as $$
begin
  if private.is_sold_status(target.status) then
    perform private.shift_order_stock(target.id, 1);
  end if;

  perform private.set_audit_reason(reason);

  update public.orders o
  set status = 'cancelled',
      status_before_cancel = target.status,
      cancel_reason = reason,
      needs_attention = false
  where o.id = target.id
  returning * into target;

  return target;
end;
$$;

create function private.expire_stale_orders()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  previous_reason text := current_setting('cutepet.reason', true);
  expired_count integer;
begin
  perform private.set_audit_reason('reservation_expired');

  update public.orders o
  set status = 'cancelled',
      status_before_cancel = 'pending_payment',
      cancel_reason = 'reservation_expired'
  where o.id in (
    select stale.id from public.orders stale
    where stale.status = 'pending_payment' and stale.reserved_until <= now()
    for update skip locked
  );

  get diagnostics expired_count = row_count;
  perform private.set_audit_reason(previous_reason);
  return expired_count;
end;
$$;

create function private.assert_valid_items(items jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if jsonb_typeof(items) is distinct from 'array' then
    perform private.raise_error('INVALID_ITEMS');
  end if;

  if jsonb_array_length(items) = 0 or exists (
    select 1 from jsonb_array_elements(items) item
    where jsonb_typeof(item -> 'variant_id') is distinct from 'number'
      or jsonb_typeof(item -> 'quantity') is distinct from 'number'
      or (item ->> 'quantity')::numeric <= 0
      or (item ->> 'quantity')::numeric <> trunc((item ->> 'quantity')::numeric)
  ) then
    perform private.raise_error('INVALID_ITEMS');
  end if;
end;
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

  insert into public.order_items (order_id, variant_id, quantity, unit_price, product_name, is_made_to_order)
  select created.id, r.variant_id, r.quantity, p.price, p.name, p.availability = 'made_to_order'
  from private.parse_items(items) r
  join public.variants v on v.id = r.variant_id
  join public.products p on p.id = v.product_id;

  return created;
end;
$$;

revoke execute on all functions in schema private from public;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.held_quantity(bigint, uuid) to anon, authenticated;
