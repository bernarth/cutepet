begin;
select plan(15);

select tests.set_settings('{"qr_checkout_enabled": true}');
select tests.create_variant(stock => 1) as pickup_variant \gset
select tests.create_variant(stock => 0, availability => 'made_to_order') as made_to_order_variant \gset
select tests.create_variant(stock => 1) as contested_variant \gset
select tests.create_user('a@test.bo') as customer_a \gset
select tests.create_user('b@test.bo') as customer_b \gset
select tests.create_user('c@test.bo') as customer_c \gset
select tests.create_user('admin@test.bo') as admin_id \gset

select tests.reserve(:'customer_a', tests.items(:pickup_variant)) as pickup_order \gset
select tests.upload_proof(:'pickup_order') as pickup_proof \gset
select tests.authenticate_as(:'customer_a');
select public.submit_payment_proof(:'pickup_order', :'pickup_proof');
select tests.clear_authentication();

select tests.authenticate_as(:'admin_id', true);
select public.confirm_order(:'pickup_order');
select tests.clear_authentication();

select is((tests.order_row(:'pickup_order')).status, 'confirmed', 'admin confirms an order with a proof');
select is(tests.stock_of(:pickup_variant), 0, 'confirming lowers the stock');
select is((select available_stock from public.catalog_variants where id = :pickup_variant), 0, 'the item is sold');

select tests.authenticate_as(:'admin_id', true);
select throws_ok(format('select public.confirm_order(%L)', :'pickup_order'), 'P0001', 'INVALID_STATUS',
  'an order cannot be confirmed twice');
select is((public.advance_order(:'pickup_order')).status, 'ready_for_pickup', 'pickup orders go to ready_for_pickup');
select is((public.advance_order(:'pickup_order')).status, 'delivered', 'and then to delivered');
select throws_ok(format('select public.advance_order(%L)', :'pickup_order'), 'P0001', 'INVALID_STATUS',
  'delivered is the last step');
select tests.clear_authentication();

select tests.authenticate_as(:'customer_b');
select (public.reserve_order(tests.items(:made_to_order_variant), 'Luis', '61234567', 'bus_parcel', 'Santa Cruz', 'Luis Rojas')).id
  as made_to_order_order \gset
select tests.clear_authentication();
select tests.upload_proof(:'made_to_order_order') as made_to_order_proof \gset
select tests.authenticate_as(:'customer_b');
select public.submit_payment_proof(:'made_to_order_order', :'made_to_order_proof');
select tests.clear_authentication();

select tests.authenticate_as(:'admin_id', true);
select public.confirm_order(:'made_to_order_order');
select is(tests.stock_of(:made_to_order_variant), 0, 'made to order items do not touch stock');
select is((public.advance_order(:'made_to_order_order')).status, 'in_production', 'made to order goes through in_production');
select is((public.advance_order(:'made_to_order_order')).status, 'shipped', 'bus parcel orders go to shipped');
select is((public.advance_order(:'made_to_order_order')).status, 'delivered', 'and then to delivered');
select tests.clear_authentication();

select tests.reserve(:'customer_a', tests.items(:contested_variant)) as late_order \gset
select tests.expire_reservation(:'late_order');
select tests.reserve(:'customer_c', tests.items(:contested_variant)) as taker_order \gset
select tests.upload_proof(:'late_order') as late_proof \gset
select tests.authenticate_as(:'customer_a');
select public.submit_payment_proof(:'late_order', :'late_proof');
select tests.clear_authentication();

select tests.authenticate_as(:'admin_id', true);
select is(
  tests.error_detail(format('select public.confirm_order(%L)', :'late_order')),
  jsonb_build_object('sold', '[]'::jsonb, 'reserved', jsonb_build_array(:contested_variant)),
  'confirming an order that needs attention fails while its item is held by someone else');
select tests.clear_authentication();

select tests.expire_reservation(:'taker_order');
select tests.authenticate_as(:'admin_id', true);
select public.confirm_order(:'late_order');
select tests.clear_authentication();

select is((tests.order_row(:'late_order')).status, 'confirmed', 'it can be confirmed once the item is free');
select is((tests.order_row(:'late_order')).needs_attention, false, 'confirming clears needs_attention');
select is(tests.stock_of(:contested_variant), 0, 'and the stock goes down');

select * from finish();
rollback;
