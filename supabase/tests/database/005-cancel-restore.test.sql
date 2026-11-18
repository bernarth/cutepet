begin;
select plan(24);

select tests.set_settings('{"qr_checkout_enabled": true, "reservation_minutes": 15}');
select tests.create_variant() as variant_a \gset
select tests.create_variant() as variant_b \gset
select tests.create_variant() as variant_c \gset
select tests.create_user('a@test.bo') as customer_a \gset
select tests.create_user('b@test.bo') as customer_b \gset
select tests.create_user('c@test.bo') as customer_c \gset
select tests.create_user('admin@test.bo') as admin_id \gset

select tests.reserve(:'customer_a', tests.items(:variant_a)) as pending_order \gset

select tests.authenticate_as(:'customer_b');
select throws_ok(format('select public.cancel_order(%L)', :'pending_order'), 'P0001', 'ORDER_NOT_FOUND',
  'a customer cannot cancel the order of someone else');
select tests.clear_authentication();

select tests.authenticate_as(:'customer_a');
select public.cancel_order(:'pending_order');
select tests.clear_authentication();

select is((tests.order_row(:'pending_order')).status, 'cancelled', 'a customer cancels a pending order');
select is((tests.order_row(:'pending_order')).cancel_reason, 'cancelled_by_customer', 'with the fixed reason');
select is((select available_stock from public.catalog_variants where id = :variant_a), 1, 'cancelling releases the item');

select tests.reserve(:'customer_b', tests.items(:variant_a)) as other_pending \gset
select tests.authenticate_as(:'admin_id', true);
select throws_ok(format('select public.restore_order(%L, %L)', :'pending_order', 'Error'), 'P0001', 'ITEMS_UNAVAILABLE',
  'restore fails while the item is reserved by someone else');
select tests.clear_authentication();
select tests.authenticate_as(:'customer_b');
select public.cancel_order(:'other_pending');
select tests.clear_authentication();

select tests.reserve(:'customer_a', tests.items(:variant_c)) as newer_pending \gset
select tests.authenticate_as(:'admin_id', true);
select throws_ok(format('select public.restore_order(%L, %L)', :'pending_order', 'Error'), 'P0001', 'PENDING_ORDER_EXISTS',
  'restoring into pending_payment fails when the customer has another pending order');
select tests.clear_authentication();
select tests.authenticate_as(:'customer_a');
select public.cancel_order(:'newer_pending');
select tests.clear_authentication();

select tests.authenticate_as(:'admin_id', true);
select public.restore_order(:'pending_order', 'El cliente sí quiere la prenda');
select tests.clear_authentication();

select is((tests.order_row(:'pending_order')).status, 'pending_payment', 'restore returns to the exact previous status');
select is((tests.order_row(:'pending_order')).reserved_until, now() + interval '15 minutes',
  'restoring into pending_payment opens a fresh window');

select tests.upload_proof(:'pending_order') as proof \gset
select tests.authenticate_as(:'customer_a');
select public.submit_payment_proof(:'pending_order', :'proof');
select throws_ok(format('select public.cancel_order(%L)', :'pending_order'), 'P0001', 'INVALID_STATUS',
  'customers cannot cancel after uploading the proof');
select tests.clear_authentication();

select tests.authenticate_as(:'admin_id', true);
select throws_ok(format('select public.cancel_order(%L)', :'pending_order'), 'P0001', 'REASON_REQUIRED',
  'admins must give a reason');
select throws_ok(format('select public.cancel_order(%L, %L)', :'pending_order', '   '), 'P0001', 'REASON_REQUIRED',
  'a blank reason is not a reason');
select public.cancel_order(:'pending_order', 'Comprobante ilegible');
select tests.clear_authentication();

select is((tests.order_row(:'pending_order')).status_before_cancel, 'proof_uploaded', 'a rejected proof is a cancellation');
select is((select available_stock from public.catalog_variants where id = :variant_a), 1, 'rejecting the proof releases the item');
select is(
  (select a.reason from public.audit_log a
   where a.record_id = :'pending_order' and a.new_data ->> 'status' = 'cancelled'
   order by a.id desc limit 1),
  'Comprobante ilegible', 'the reason is in the audit log');

select tests.authenticate_as(:'admin_id', true);
select public.restore_order(:'pending_order', 'Rechazado por error');
select public.confirm_order(:'pending_order');
select tests.clear_authentication();

select is(tests.stock_of(:variant_a), 0, 'a restored proof can be confirmed');

select tests.authenticate_as(:'admin_id', true);
select public.cancel_order(:'pending_order', 'El cliente se arrepintió');
select tests.clear_authentication();

select is(tests.stock_of(:variant_a), 1, 'cancelling a sold order returns the stock');

select tests.authenticate_as(:'admin_id', true);
select public.restore_order(:'pending_order', 'Siempre sí');
select tests.clear_authentication();

select is((tests.order_row(:'pending_order')).status, 'confirmed', 'restore brings back the sold status');
select is(tests.stock_of(:variant_a), 0, 'and takes the stock again');

select tests.authenticate_as(:'admin_id', true);
select public.cancel_order(:'pending_order', 'Otra vez no');
select public.create_quick_sale(tests.items(:variant_a), 'Rosa', '71112222', 'pickup_point');
select is(
  tests.error_detail(format('select public.restore_order(%L, %L)', :'pending_order', 'Intento')),
  jsonb_build_object('sold', jsonb_build_array(:variant_a), 'reserved', '[]'::jsonb),
  'restore fails listing the items that were sold meanwhile');
select is((tests.order_row(:'pending_order')).status, 'cancelled', 'a failed restore changes nothing');
select public.advance_order((public.create_quick_sale(tests.items(:variant_b), 'Rosa', '71112222', 'pickup_point')).id);
select tests.clear_authentication();

select (o.id) as delivered_order from public.orders o
where o.channel = 'whatsapp' and o.status = 'ready_for_pickup' \gset
select tests.authenticate_as(:'admin_id', true);
select public.advance_order(:'delivered_order');
select throws_ok(format('select public.cancel_order(%L, %L)', :'delivered_order', 'Tarde'), 'P0001', 'INVALID_STATUS',
  'delivered orders cannot be cancelled');
select tests.clear_authentication();

select tests.reserve(:'customer_a', tests.items(:variant_c)) as attention_order \gset
select tests.expire_reservation(:'attention_order');
select tests.reserve(:'customer_c', tests.items(:variant_c)) as taker_order \gset
select tests.upload_proof(:'attention_order') as attention_proof \gset
select tests.authenticate_as(:'customer_a');
select public.submit_payment_proof(:'attention_order', :'attention_proof');
select tests.clear_authentication();

select is((tests.order_row(:'attention_order')).needs_attention, true, 'the late order needs attention');
select tests.authenticate_as(:'admin_id', true);
select public.cancel_order(:'attention_order', 'Prenda ya vendida, se devuelve el dinero');
select tests.clear_authentication();
select is((tests.order_row(:'attention_order')).needs_attention, false, 'cancelling clears needs_attention');

select tests.authenticate_as(:'customer_c');
select throws_ok(format('select public.restore_order(%L, %L)', :'attention_order', 'x'), 'P0001', 'FORBIDDEN',
  'customers cannot restore orders');
select tests.clear_authentication();

select * from finish();
rollback;
