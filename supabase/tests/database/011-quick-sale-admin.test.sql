begin;
select plan(5);

select tests.create_user('admin@test.bo') as admin_id \gset
select tests.create_variant(price => 120, stock => 1) as coat_variant \gset
select tests.create_variant(is_active => false) as archived_variant \gset

select tests.authenticate_as(:'admin_id', as_admin => true);

select throws_ok(
  format('select public.create_quick_sale(%L::jsonb, %L, %L, %L)',
    tests.items(:archived_variant), 'Eva', '71234567', 'pickup_point'),
  'P0001', 'VARIANT_NOT_FOUND', 'an archived product cannot be sold');

select throws_ok(
  format('select public.create_quick_sale(%L::jsonb, %L, %L, %L)',
    tests.items(:coat_variant), 'Eva', '71234567', 'bus_parcel'),
  '23514', null, 'a bus parcel quick sale needs the destination city and recipient');

select throws_ok(
  format('select public.create_quick_sale(%L::jsonb, %L, %L, %L)',
    tests.items(:coat_variant), 'Eva', '22123456', 'pickup_point'),
  '23514', null, 'the customer phone must be a Bolivian mobile');

select (public.create_quick_sale(tests.items(:coat_variant), 'Luis', '61234567', 'bus_parcel',
  'Santa Cruz', 'Luis Rojas')).id as bus_order \gset

select is(
  (select row(o.destination_city, o.recipient_name, o.items_total, o.pickup_fee)::text
   from public.orders o where o.id = :'bus_order'),
  row('Santa Cruz', 'Luis Rojas', 120.00::numeric(10, 2), 0.00::numeric(10, 2))::text,
  'a bus parcel quick sale keeps the shipping data and has no pickup fee');

select throws_ok(
  format('select public.create_quick_sale(%L::jsonb, %L, %L, %L)',
    tests.items(:coat_variant), 'Eva', '71234567', 'pickup_point'),
  'P0001', 'ITEMS_UNAVAILABLE', 'a unique item sold by quick sale cannot be sold again');

select * from finish();
rollback;
