begin;
select plan(22);

select tests.set_settings('{"qr_checkout_enabled": true, "reservation_minutes": 15, "pickup_fee": 2, "free_pickup_min_items": 3}');
select tests.create_variant(price => 100) as unique_variant \gset
select tests.create_variant(price => 50) as second_variant \gset
select tests.create_variant(stock => 0) as sold_variant \gset
select tests.create_variant(is_active => false) as inactive_variant \gset
select tests.create_user('a@test.bo') as customer_a \gset
select tests.create_user('b@test.bo') as customer_b \gset
select tests.create_user('c@test.bo') as customer_c \gset

select tests.reserve(:'customer_a', tests.items(:unique_variant)) as order_a \gset

select is((tests.order_row(:'order_a')).status, 'pending_payment', 'a reservation starts as pending_payment');
select is((tests.order_row(:'order_a')).reserved_until, now() + interval '15 minutes',
  'the reservation lasts the configured minutes');
select is((tests.order_row(:'order_a')).items_total, 100.00::numeric, 'the total comes from the database price');
select is((tests.order_row(:'order_a')).pickup_fee, 2.00::numeric, 'pickup costs Bs 2 below the free pickup quantity');
select matches((tests.order_row(:'order_a')).code, '^CP[0-9]+$', 'the order gets a typeable code');

select tests.authenticate_as(:'customer_b');
select throws_ok(
  format('select public.reserve_order(%L::jsonb, %L, %L, %L)', tests.items(:unique_variant), 'Eva', '71234567', 'pickup_point'),
  'P0001', 'ITEMS_UNAVAILABLE', 'a second customer cannot take a reserved unique item');
select is(
  tests.error_detail(format('select public.reserve_order(%L::jsonb, %L, %L, %L)',
    tests.items(:unique_variant), 'Eva', '71234567', 'pickup_point')),
  jsonb_build_object('sold', '[]'::jsonb, 'reserved', jsonb_build_array(:unique_variant)),
  'the error lists the reserved item');
select is(
  tests.error_detail(format('select public.reserve_order(%L::jsonb, %L, %L, %L)',
    tests.items(:sold_variant), 'Eva', '71234567', 'pickup_point')),
  jsonb_build_object('sold', jsonb_build_array(:sold_variant), 'reserved', '[]'::jsonb),
  'the error lists the sold item');
select throws_ok(
  format('select public.reserve_order(%L::jsonb, %L, %L, %L)', tests.items(:inactive_variant), 'Eva', '71234567', 'pickup_point'),
  'P0001', 'VARIANT_NOT_FOUND', 'inactive products cannot be reserved');
select throws_ok(
  format('select public.reserve_order(%L::jsonb, %L, %L, %L)', '[]', 'Eva', '71234567', 'pickup_point'),
  'P0001', 'INVALID_ITEMS', 'an empty cart is rejected');
select throws_ok(
  format('select public.reserve_order(%L::jsonb, %L, %L, %L)',
    jsonb_build_array(jsonb_build_object('variant_id', :second_variant, 'quantity', 0)), 'Eva', '71234567', 'pickup_point'),
  'P0001', 'INVALID_ITEMS', 'a zero quantity is rejected');
select throws_ok(
  format('select public.reserve_order(%L::jsonb, %L, %L, %L)', tests.items(:second_variant), 'Eva', '51234567', 'pickup_point'),
  '23514', null, 'the phone must have 8 digits and start with 6 or 7');
select throws_ok(
  format('select public.reserve_order(%L::jsonb, %L, %L, %L)', tests.items(:second_variant), 'Eva', '71234567', 'bus_parcel'),
  '23514', null, 'bus parcel shipping needs a destination and a recipient');
select tests.clear_authentication();

select tests.expire_reservation(:'order_a');
select tests.reserve(:'customer_b', tests.items(:unique_variant)) as order_b \gset

select is((tests.order_row(:'order_b')).status, 'pending_payment', 'an expired reservation frees the item');
select is((tests.order_row(:'order_a')).status, 'cancelled', 'the expired order is cancelled lazily');
select is((tests.order_row(:'order_a')).cancel_reason, 'reservation_expired', 'with the expiry reason');

select tests.reserve(:'customer_c', tests.items(:second_variant)) as first_order_c \gset
select tests.reserve(:'customer_c', tests.items(:second_variant)) as second_order_c \gset

select is((tests.order_row(:'first_order_c')).cancel_reason, 'replaced_by_new_order',
  'a new reservation cancels the previous pending order of the same customer');
select is((tests.order_row(:'second_order_c')).status, 'pending_payment', 'the new reservation can take the same item');

update public.products set price = 999, name = 'Otro nombre'
where id = (select product_id from public.variants where id = :second_variant);

select is(
  (select (oi.unit_price, oi.product_name)::text from public.order_items oi where oi.order_id = :'second_order_c'),
  (select (50.00::numeric(10, 2), 'Prenda ' || replace(p.slug, 'prenda-', ''))::text
   from public.products p join public.variants v on v.product_id = p.id where v.id = :second_variant),
  'editing a product does not change the price or name stored on past orders');

select tests.set_settings('{"free_pickup_min_items": 1, "shipping_promo_enabled": true, "shipping_promo_min_items": 1}');
select tests.create_variant() as promo_variant \gset
select tests.authenticate_as(:'customer_a');
select (public.reserve_order(tests.items(:promo_variant), 'Ana', '61234567', 'bus_parcel', 'Cochabamba', 'Ana Pérez')).id
  as bus_order \gset
select tests.clear_authentication();

select is((tests.order_row(:'bus_order')).shipping_paid_by_store, true,
  'the shipping promotion is stored as a snapshot on the order');
select is((tests.order_row(:'bus_order')).pickup_fee, 0.00::numeric, 'bus parcel orders have no pickup fee');

select tests.set_settings('{"qr_checkout_enabled": false}');
select tests.authenticate_as(:'customer_a');
select throws_ok(
  format('select public.reserve_order(%L::jsonb, %L, %L, %L)', tests.items(:second_variant), 'Eva', '71234567', 'pickup_point'),
  'P0001', 'QR_CHECKOUT_DISABLED', 'QR checkout can be switched off');
select tests.clear_authentication();

select * from finish();
rollback;
