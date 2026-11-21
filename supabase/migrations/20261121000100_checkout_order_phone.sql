-- The payment and confirmation screens show the phone the owner will write to, so a typo is easy
-- to notice. status_before_cancel tells a rejected proof apart from other cancellations.

drop function public.my_checkout_order(text);

create function public.my_checkout_order(order_code text default null)
returns table (
  id uuid,
  code text,
  status public.order_status,
  cancel_reason text,
  status_before_cancel public.order_status,
  needs_attention boolean,
  delivery_method public.delivery_method,
  destination_city text,
  items_total numeric,
  pickup_fee numeric,
  shipping_paid_by_store boolean,
  customer_phone text,
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
    target.status_before_cancel,
    target.needs_attention,
    target.delivery_method,
    target.destination_city,
    target.items_total,
    target.pickup_fee,
    target.shipping_paid_by_store,
    target.customer_phone,
    case
      when target.status = 'pending_payment'
        then greatest(0, ceil(extract(epoch from target.reserved_until - now())))::integer
    end;
end;
$$;

revoke execute on function public.my_checkout_order(text) from public, anon;
grant execute on function public.my_checkout_order(text) to authenticated;
