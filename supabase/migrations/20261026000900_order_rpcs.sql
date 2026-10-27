create function public.reserve_order(
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

  if not (select s.qr_checkout_enabled from public.settings s) then
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

create function public.submit_payment_proof(order_id uuid, proof_path text)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.orders;
  is_on_time boolean;
  is_late boolean;
  problems jsonb;
begin
  if caller is null then
    perform private.raise_error('NOT_AUTHENTICATED');
  end if;

  perform private.expire_stale_orders();
  target := private.lock_order(submit_payment_proof.order_id);

  if target.customer_id is distinct from caller then
    perform private.raise_error('ORDER_NOT_FOUND');
  end if;

  if proof_path is null
    or proof_path not like target.id::text || '/%'
    or not exists (
      select 1 from storage.objects so
      where so.bucket_id = 'payment-proofs' and so.name = proof_path
    ) then
    perform private.raise_error('INVALID_PROOF_PATH');
  end if;

  is_on_time := target.status = 'pending_payment' and target.reserved_until > now();
  is_late := (target.status = 'pending_payment' and target.reserved_until <= now())
    or (target.status = 'cancelled' and target.cancel_reason = 'reservation_expired');

  if not (is_on_time or is_late) then
    perform private.raise_error('INVALID_STATUS');
  end if;

  if is_late then
    problems := private.unavailable_items(private.order_stock_items(target.id), target.id);
    perform private.set_audit_reason('late_payment_proof');
  else
    perform private.set_audit_reason(null);
  end if;

  update public.orders o
  set status = 'proof_uploaded',
      status_before_cancel = null,
      cancel_reason = null,
      needs_attention = problems is not null,
      payment_proof_path = proof_path
  where o.id = target.id
  returning * into target;

  return target;
end;
$$;

create function public.confirm_order(order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.orders;
begin
  perform private.require_admin();
  perform private.expire_stale_orders();
  target := private.lock_order(confirm_order.order_id);

  if target.status <> 'proof_uploaded' then
    perform private.raise_error('INVALID_STATUS');
  end if;

  perform private.lock_and_check_variants(private.order_stock_items(target.id), target.id);
  perform private.shift_order_stock(target.id, -1);
  perform private.set_audit_reason(null);

  update public.orders o
  set status = 'confirmed', needs_attention = false
  where o.id = target.id
  returning * into target;

  return target;
end;
$$;

create function public.advance_order(order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.orders;
  next_order_status public.order_status;
begin
  perform private.require_admin();
  target := private.lock_order(advance_order.order_id);
  next_order_status := private.next_status(target);

  if next_order_status is null then
    perform private.raise_error('INVALID_STATUS');
  end if;

  perform private.set_audit_reason(null);

  update public.orders o
  set status = next_order_status
  where o.id = target.id
  returning * into target;

  return target;
end;
$$;

create function public.cancel_order(order_id uuid, reason text default null)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.orders;
  cleaned_reason text;
begin
  if caller is null then
    perform private.raise_error('NOT_AUTHENTICATED');
  end if;

  perform private.expire_stale_orders();
  target := private.lock_order(cancel_order.order_id);

  if private.is_admin() then
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

create function public.restore_order(order_id uuid, reason text)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.orders;
  restored_status public.order_status;
begin
  perform private.require_admin();
  perform private.expire_stale_orders();
  perform private.require_reason(reason);
  target := private.lock_order(restore_order.order_id);
  restored_status := target.status_before_cancel;

  if target.status <> 'cancelled' then
    perform private.raise_error('INVALID_STATUS');
  end if;

  if restored_status = 'pending_payment' and private.has_other_pending_order(target) then
    perform private.raise_error('PENDING_ORDER_EXISTS');
  end if;

  perform private.lock_and_check_variants(private.order_stock_items(target.id), target.id);

  if private.is_sold_status(restored_status) then
    perform private.shift_order_stock(target.id, -1);
  end if;

  update public.orders o
  set status = restored_status,
      status_before_cancel = null,
      cancel_reason = null,
      needs_attention = false,
      reserved_until = case
        when restored_status = 'pending_payment' then private.reservation_deadline()
        else o.reserved_until
      end
  where o.id = target.id
  returning * into target;

  return target;
end;
$$;

create function public.revert_order_status(order_id uuid, reason text)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.orders;
  previous_order_status public.order_status;
begin
  perform private.require_admin();
  perform private.expire_stale_orders();
  perform private.require_reason(reason);
  target := private.lock_order(revert_order_status.order_id);
  previous_order_status := private.previous_status(target);

  if previous_order_status is null then
    perform private.raise_error('INVALID_STATUS');
  end if;

  if previous_order_status = 'pending_payment' and private.has_other_pending_order(target) then
    perform private.raise_error('PENDING_ORDER_EXISTS');
  end if;

  if previous_order_status = 'pending_payment' and target.needs_attention then
    perform private.lock_and_check_variants(private.order_stock_items(target.id), target.id);
  end if;

  if private.is_sold_status(target.status) and not private.is_sold_status(previous_order_status) then
    perform private.shift_order_stock(target.id, 1);
  end if;

  update public.orders o
  set status = previous_order_status,
      needs_attention = case when previous_order_status = 'pending_payment' then false else o.needs_attention end,
      reserved_until = case
        when previous_order_status = 'pending_payment' then private.reservation_deadline()
        else o.reserved_until
      end
  where o.id = target.id
  returning * into target;

  return target;
end;
$$;

create function public.create_quick_sale(
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
  created public.orders;
begin
  perform private.require_admin();
  perform private.expire_stale_orders();
  perform private.set_audit_reason(null);

  created := private.create_order(
    'whatsapp', 'confirmed', null, items, customer_name, customer_phone,
    delivery_method, destination_city, recipient_name, recipient_id_number
  );

  perform private.shift_order_stock(created.id, -1);
  return created;
end;
$$;

create function public.adjust_stock(variant_id bigint, new_stock integer, reason text)
returns public.variants
language plpgsql
security definer
set search_path = ''
as $$
declare
  adjusted public.variants;
begin
  perform private.require_admin();
  perform private.expire_stale_orders();
  perform private.require_reason(reason);
  perform private.lock_variants(array[adjust_stock.variant_id]);

  if not exists (select 1 from public.variants v where v.id = adjust_stock.variant_id) then
    perform private.raise_error('VARIANT_NOT_FOUND');
  end if;

  if new_stock is null or new_stock < 0 then
    perform private.raise_error('INVALID_STOCK');
  end if;

  if new_stock < private.held_quantity(adjust_stock.variant_id) then
    perform private.raise_error('STOCK_BELOW_HELD');
  end if;

  update public.variants v
  set stock = new_stock
  where v.id = adjust_stock.variant_id
  returning * into adjusted;

  return adjusted;
end;
$$;

revoke execute on function public.reserve_order(jsonb, text, text, public.delivery_method, text, text, text) from public, anon;
revoke execute on function public.submit_payment_proof(uuid, text) from public, anon;
revoke execute on function public.confirm_order(uuid) from public, anon;
revoke execute on function public.advance_order(uuid) from public, anon;
revoke execute on function public.cancel_order(uuid, text) from public, anon;
revoke execute on function public.restore_order(uuid, text) from public, anon;
revoke execute on function public.revert_order_status(uuid, text) from public, anon;
revoke execute on function public.create_quick_sale(jsonb, text, text, public.delivery_method, text, text, text) from public, anon;
revoke execute on function public.adjust_stock(bigint, integer, text) from public, anon;

grant execute on function public.reserve_order(jsonb, text, text, public.delivery_method, text, text, text) to authenticated;
grant execute on function public.submit_payment_proof(uuid, text) to authenticated;
grant execute on function public.confirm_order(uuid) to authenticated;
grant execute on function public.advance_order(uuid) to authenticated;
grant execute on function public.cancel_order(uuid, text) to authenticated;
grant execute on function public.restore_order(uuid, text) to authenticated;
grant execute on function public.revert_order_status(uuid, text) to authenticated;
grant execute on function public.create_quick_sale(jsonb, text, text, public.delivery_method, text, text, text) to authenticated;
grant execute on function public.adjust_stock(bigint, integer, text) to authenticated;
