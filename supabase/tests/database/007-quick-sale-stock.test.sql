begin;
select plan(16);

select tests.set_settings('{"qr_checkout_enabled": true}');
select tests.create_variant(stock => 2) as quick_variant \gset
select tests.create_variant() as reserved_variant \gset
select tests.create_variant(stock => 1) as adjusted_variant \gset
select tests.create_user('a@test.bo') as customer_a \gset
select tests.create_user('admin@test.bo') as admin_id \gset

select tests.authenticate_as(:'customer_a');
select throws_ok(
  format('select public.create_quick_sale(%L::jsonb, %L, %L, %L)', tests.items(:quick_variant), 'Rosa', '71112222', 'pickup_point'),
  'P0001', 'FORBIDDEN', 'customers cannot create quick sales');
select throws_ok(format('select public.adjust_stock(%s, 5, %L)', :adjusted_variant, 'x'), 'P0001', 'FORBIDDEN',
  'customers cannot adjust stock');
select tests.clear_authentication();

select tests.authenticate_as(:'admin_id', true);
select (public.create_quick_sale(tests.items(:quick_variant), 'Rosa', '71112222', 'pickup_point')).id as quick_order \gset
select tests.clear_authentication();

select is((tests.order_row(:'quick_order')).channel, 'whatsapp', 'a quick sale is an order with channel whatsapp');
select is((tests.order_row(:'quick_order')).status, 'confirmed', 'created directly as confirmed');
select is((tests.order_row(:'quick_order')).customer_id, null, 'with no customer account');
select is(tests.stock_of(:quick_variant), 1, 'a quick sale lowers the stock');

select tests.reserve(:'customer_a', tests.items(:reserved_variant)) as web_order \gset

select tests.authenticate_as(:'admin_id', true);
select throws_ok(
  format('select public.create_quick_sale(%L::jsonb, %L, %L, %L)', tests.items(:reserved_variant), 'Rosa', '71112222', 'pickup_point'),
  'P0001', 'ITEMS_UNAVAILABLE', 'a quick sale cannot take an item reserved on the web');
select throws_ok(format('select public.adjust_stock(%s, 0, %L)', :reserved_variant, 'Prenda dañada'), 'P0001', 'STOCK_BELOW_HELD',
  'stock cannot go below what active orders hold');
select throws_ok(format('select public.adjust_stock(%s, 3, %L)', :adjusted_variant, ''), 'P0001', 'REASON_REQUIRED',
  'a stock adjustment needs a reason');
select throws_ok(format('select public.adjust_stock(%s, -1, %L)', :adjusted_variant, 'x'), 'P0001', 'INVALID_STOCK',
  'stock cannot be negative');
select throws_ok(format('select public.adjust_stock(%s, 1, %L)', 999999999, 'x'), 'P0001', 'VARIANT_NOT_FOUND',
  'the variant must exist');
select is((public.adjust_stock(:adjusted_variant, 3, 'Error de carga')).stock, 3, 'admin adjusts stock with a reason');
select tests.clear_authentication();

select is(
  (select (a.reason, a.old_data ->> 'stock', a.new_data ->> 'stock', a.actor_id)::text
   from public.audit_log a
   where a.table_name = 'variants' and a.record_id = :'adjusted_variant'::text and a.action = 'update'
   order by a.id desc limit 1),
  ('Error de carga', '1', '3', :'admin_id'::uuid)::text,
  'the adjustment is audited with who, why, old and new value');

select tests.authenticate_as(:'admin_id', true);
select throws_ok(
  format('select public.create_quick_sale(%L::jsonb, %L, %L, %L)',
    jsonb_build_array(jsonb_build_object('variant_id', :quick_variant, 'quantity', 2)), 'Rosa', '71112222', 'pickup_point'),
  'P0001', 'ITEMS_UNAVAILABLE', 'a quick sale cannot sell more units than the stock');
select tests.clear_authentication();

select is(
  (select count(*)::integer from public.audit_log a where a.table_name = 'orders' and a.record_id = :'quick_order'),
  1, 'the quick sale is audited');
select is(
  (select a.actor_id from public.audit_log a where a.table_name = 'orders' and a.record_id = :'quick_order'),
  :'admin_id'::uuid, 'with the admin as the actor');

select * from finish();
rollback;
