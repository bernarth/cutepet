-- An admin who buys through the store cancels their own order like any customer.
-- Before, the admin branch ran first and asked for a reason the payment screen never sends.
-- The admin panel always sends a reason, so it keeps using the admin branch.
create or replace function public.cancel_order(order_id uuid, reason text default null)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.orders;
  cleaned_reason text;
  is_own_cancel boolean;
begin
  if caller is null then
    perform private.raise_error('NOT_AUTHENTICATED');
  end if;

  perform private.expire_stale_orders();
  target := private.lock_order(cancel_order.order_id);
  is_own_cancel := target.customer_id = caller and cancel_order.reason is null;

  if private.is_admin() and not is_own_cancel then
    cleaned_reason := private.require_reason(reason);

    if target.status in ('delivered', 'cancelled') then
      perform private.raise_error('INVALID_STATUS');
    end if;
  else
    if target.customer_id is distinct from caller then
      perform private.raise_error('ORDER_NOT_FOUND');
    end if;

    if target.status <> 'pending_payment' then
      perform private.raise_error('INVALID_STATUS');
    end if;

    cleaned_reason := 'cancelled_by_customer';
  end if;

  return private.cancel_order_row(target, cleaned_reason);
end;
$$;
