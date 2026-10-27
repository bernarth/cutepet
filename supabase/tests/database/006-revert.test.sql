begin;
select plan(17);

select tests.set_settings('{"qr_checkout_enabled": true}');
select tests.create_variant() as web_variant \gset
select tests.create_variant() as bus_variant \gset
select tests.create_variant() as quick_variant \gset
select tests.create_variant() as contested_variant \gset
select tests.create_user('a@test.bo') as customer_a \gset
select tests.create_user('b@test.bo') as customer_b \gset
select tests.create_user('c@test.bo') as customer_c \gset
select tests.create_user('admin@test.bo') as admin_id \gset

select tests.reserve(:'customer_a', tests.items(:web_variant)) as web_order \gset
select tests.upload_proof(:'web_order') as web_proof \gset
select tests.authenticate_as(:'customer_a');
select public.submit_payment_proof(:'web_order', :'web_proof');
select tests.clear_authentication();

select tests.authenticate_as(:'admin_id', true);
select throws_ok(format('select public.revert_order_status(%L, %L)', :'web_order', ''), 'P0001', 'REASON_REQUIRED',
  'revert needs a reason');
select public.confirm_order(:'web_order');
select public.advance_order(:'web_order');
select public.advance_order(:'web_order');
select is((public.revert_order_status(:'web_order', 'No lo recogió')).status, 'ready_for_pickup',
  'delivered goes back to ready_for_pickup for pickup orders');
select is((public.revert_order_status(:'web_order', 'Aún no está lista')).status, 'confirmed',
  'ready_for_pickup goes back to confirmed');
select is((public.revert_order_status(:'web_order', 'Pago no llegó')).status, 'proof_uploaded',
  'confirmed goes back to proof_uploaded for web orders');
select tests.clear_authentication();

select is(tests.stock_of(:web_variant), 1, 'leaving a sold status returns the stock');
select is((select available_stock from public.catalog_variants where id = :web_variant), 0,
  'but the item stays held by the proof');

select tests.authenticate_as(:'admin_id', true);
select is((public.revert_order_status(:'web_order', 'Subir otro comprobante')).status, 'pending_payment',
  'proof_uploaded goes back to pending_payment');
select tests.clear_authentication();

select is((tests.order_row(:'web_order')).reserved_until, now() + interval '15 minutes',
  'reverting into pending_payment opens a fresh window');

select tests.authenticate_as(:'admin_id', true);
select throws_ok(format('select public.revert_order_status(%L, %L)', :'web_order', 'x'), 'P0001', 'INVALID_STATUS',
  'pending_payment has no previous status');
select tests.clear_authentication();

select tests.authenticate_as(:'customer_b');
select (public.reserve_order(tests.items(:bus_variant), 'Luis', '61234567', 'bus_parcel', 'Oruro', 'Luis Rojas')).id
  as bus_order \gset
select tests.clear_authentication();
select tests.upload_proof(:'bus_order') as bus_proof \gset
select tests.authenticate_as(:'customer_b');
select public.submit_payment_proof(:'bus_order', :'bus_proof');
select tests.clear_authentication();

select tests.authenticate_as(:'admin_id', true);
select public.confirm_order(:'bus_order');
select public.advance_order(:'bus_order');
select public.advance_order(:'bus_order');
select is((public.revert_order_status(:'bus_order', 'Sigue en la terminal')).status, 'shipped',
  'delivered goes back to shipped for bus parcel orders');
select is((public.revert_order_status(:'bus_order', 'No salió la flota')).status, 'confirmed',
  'shipped goes back to confirmed');

select (public.create_quick_sale(tests.items(:quick_variant), 'Rosa', '71112222', 'pickup_point')).id as quick_order \gset
select throws_ok(format('select public.revert_order_status(%L, %L)', :'quick_order', 'x'), 'P0001', 'INVALID_STATUS',
  'quick sales cannot be reverted below confirmed');
select public.advance_order(:'quick_order');
select is((public.revert_order_status(:'quick_order', 'Error')).status, 'confirmed',
  'quick sales can be reverted down to confirmed');
select tests.clear_authentication();

select tests.reserve(:'customer_a', tests.items(:contested_variant)) as late_order \gset
select tests.expire_reservation(:'late_order');
select tests.reserve(:'customer_c', tests.items(:contested_variant)) as taker_order \gset
select tests.upload_proof(:'late_order') as late_proof \gset
select tests.authenticate_as(:'customer_a');
select public.submit_payment_proof(:'late_order', :'late_proof');
select tests.clear_authentication();

select tests.authenticate_as(:'admin_id', true);
select throws_ok(format('select public.revert_order_status(%L, %L)', :'late_order', 'Reintentar'), 'P0001', 'ITEMS_UNAVAILABLE',
  'an order that needs attention cannot go back to pending_payment while its item is taken');
select tests.clear_authentication();

select tests.expire_reservation(:'taker_order');
select tests.authenticate_as(:'admin_id', true);
select is((public.revert_order_status(:'late_order', 'Reintentar')).status, 'pending_payment',
  'it can once the item is free');
select tests.clear_authentication();
select is((tests.order_row(:'late_order')).needs_attention, false, 'and the flag is cleared');
select is(private.held_quantity(:contested_variant), 1, 'the order holds the item again');

select * from finish();
rollback;
