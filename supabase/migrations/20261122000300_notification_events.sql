-- Step 7: the events that queue owner alerts.
-- submit_payment_proof queues proof_uploaded. Restore and revert also reach proof_uploaded but
-- never alert, which is why the event is queued here and not by a status trigger.
-- close_expired_qr queues qr_expiry: a warning 7, 3 and 1 days before, and a notice when it
-- turns QR checkout off. It runs at 00:05 La Paz, so QR alerts are silent.

create function private.proof_uploaded_message(target public.orders, is_late boolean)
returns text
language sql
stable
set search_path = ''
as $$
  select concat_ws(E'\n',
    case
      when target.needs_attention then '⚠️ <b>Comprobante tardío con prenda vendida · ' || target.code || '</b>'
      else '🧾 <b>Comprobante subido · ' || target.code || '</b>'
    end,
    case
      when target.needs_attention
        then 'La reserva venció y una prenda ya no está libre. Resuélvelo por WhatsApp antes de confirmar.'
      when is_late then 'Llegó después de que venció la reserva; las prendas seguían libres.'
    end,
    private.format_bs(target.items_total) || ' · ' || private.html_escape(target.customer_name) || ' · '
      || '<a href="https://wa.me/591' || target.customer_phone || '">' || target.customer_phone || '</a>',
    case target.delivery_method
      when 'pickup_point' then 'Recojo en La Paz'
      else 'Envío por flota a ' || private.html_escape(target.destination_city)
    end,
    'Subido el ' || private.store_time_label(now()),
    private.admin_link('/admin/pedidos/' || target.code)
  );
$$;

create function private.qr_expiry_message(expires_on date, is_expired boolean)
returns text
language sql
stable
set search_path = ''
as $$
  select concat_ws(E'\n',
    case
      when is_expired then '⛔ <b>El QR venció y se desactivó el pago con QR</b>'
      when expires_on - private.store_today() = 1 then '⏰ <b>El QR de cobro vence mañana</b>'
      else '⏰ <b>El QR de cobro vence en ' || (expires_on - private.store_today()) || ' días</b>'
    end,
    case
      when is_expired then 'Venció el ' || private.store_date_label(expires_on) || '. Sube un QR nuevo y vuelve a activarlo.'
      else 'Vence el ' || private.store_date_label(expires_on) || '. Sube un QR nuevo antes de esa fecha.'
    end,
    private.admin_link('/admin/configuracion')
  );
$$;

create or replace function public.submit_payment_proof(order_id uuid, proof_path text)
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

  perform private.enqueue_notification('proof_uploaded', private.proof_uploaded_message(target, is_late));

  return target;
end;
$$;

-- Returns true when it switched QR checkout off
create or replace function private.close_expired_qr()
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  current_settings public.settings;
  closed_count integer;
begin
  select * into current_settings from public.settings;

  perform private.set_audit_reason('qr_expired');

  update public.settings s
  set qr_checkout_enabled = false
  where s.qr_checkout_enabled and s.qr_expires_on < private.store_today();

  get diagnostics closed_count = row_count;
  perform private.set_audit_reason(null);

  if closed_count > 0 then
    perform private.enqueue_notification(
      'qr_expiry', private.qr_expiry_message(current_settings.qr_expires_on, true), true
    );
  elsif current_settings.qr_checkout_enabled
    and current_settings.qr_expires_on - private.store_today() in (7, 3, 1) then
    perform private.enqueue_notification(
      'qr_expiry', private.qr_expiry_message(current_settings.qr_expires_on, false), true
    );
  end if;

  return closed_count > 0;
end;
$$;
