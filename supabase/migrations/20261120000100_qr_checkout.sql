-- Step 6: QR checkout.
-- An expired QR turns QR checkout off: reserve_order refuses it right away and a daily job
-- switches the setting off so the admin panel shows it. my_checkout_order lets the customer
-- come back to an order and tells the payment page how many seconds are left.

create function private.store_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/La_Paz')::date;
$$;

-- The QR still works on its expiry date, in La Paz time
create function private.is_qr_checkout_open()
returns boolean
language sql
stable
set search_path = ''
as $$
  select s.qr_checkout_enabled
    and s.qr_image_path is not null
    and (s.qr_expires_on is null or s.qr_expires_on >= private.store_today())
  from public.settings s;
$$;

create or replace function public.reserve_order(
  items jsonb,
  customer_name text,
  customer_phone text,
  delivery_method public.delivery_method,
  destination_city text default null,
  recipient_name text default null,
  recipient_id_number text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    perform private.raise_error('NOT_AUTHENTICATED');
  end if;

  if not private.is_qr_checkout_open() then
    perform private.raise_error('QR_CHECKOUT_DISABLED');
  end if;

  perform private.expire_stale_orders();

  perform private.cancel_order_row(previous, 'replaced_by_new_order')
  from public.orders previous
  where previous.customer_id = caller and previous.status = 'pending_payment';

  perform private.set_audit_reason(null);

  return private.create_order(
    'web', 'pending_payment', caller, items, customer_name, customer_phone,
    delivery_method, destination_city, recipient_name, recipient_id_number
  );
end;
$$;

-- Returns true when it switched QR checkout off
create function private.close_expired_qr()
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  closed_count integer;
begin
  perform private.set_audit_reason('qr_expired');

  update public.settings s
  set qr_checkout_enabled = false
  where s.qr_checkout_enabled and s.qr_expires_on < private.store_today();

  get diagnostics closed_count = row_count;
  perform private.set_audit_reason(null);
  return closed_count > 0;
end;
$$;

-- 04:05 UTC is 00:05 in La Paz, which has no daylight saving time
select cron.schedule('close-expired-qr', '5 4 * * *', 'select private.close_expired_qr()');

-- With a code: that order, if it belongs to the caller.
-- Without a code: the caller's latest web order, only while it still needs the payment page
-- (pending, or expired so a late proof can still be sent).
create function public.my_checkout_order(order_code text default null)
returns table (
  id uuid,
  code text,
  status public.order_status,
  cancel_reason text,
  needs_attention boolean,
  delivery_method public.delivery_method,
  destination_city text,
  items_total numeric,
  pickup_fee numeric,
  shipping_paid_by_store boolean,
  seconds_left integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.orders;
begin
  if caller is null then
    perform private.raise_error('NOT_AUTHENTICATED');
  end if;

  perform private.expire_stale_orders();

  select o.* into target
  from public.orders o
  where o.customer_id = caller
    and o.channel = 'web'
    and (order_code is null or o.code = order_code)
  order by o.created_at desc
  limit 1;

  if target.id is null then
    return;
  end if;

  if order_code is null and not (
    target.status = 'pending_payment'
    or (target.status = 'cancelled' and target.cancel_reason = 'reservation_expired')
  ) then
    return;
  end if;

  return query select
    target.id,
    target.code,
    target.status,
    target.cancel_reason,
    target.needs_attention,
    target.delivery_method,
    target.destination_city,
    target.items_total,
    target.pickup_fee,
    target.shipping_paid_by_store,
    case
      when target.status = 'pending_payment'
        then greatest(0, ceil(extract(epoch from target.reserved_until - now())))::integer
    end;
end;
$$;

revoke execute on function public.my_checkout_order(text) from public, anon;
grant execute on function public.my_checkout_order(text) to authenticated;
