begin;
select plan(11);

select tests.set_settings('{"qr_checkout_enabled": true, "reservation_minutes": 15}');
select tests.create_user('admin@test.bo') as admin_id \gset
select tests.create_user('customer@test.bo') as customer_id \gset
update auth.users set raw_user_meta_data = '{"full_name": "Dueña CutePet"}' where id = :'admin_id';
insert into public.user_roles (user_id, role) values (:'admin_id', 'admin');
select tests.create_variant() as web_variant \gset
select tests.create_variant() as pickup_variant \gset
select tests.create_variant() as bus_variant \gset

select tests.reserve(:'customer_id', tests.items(:web_variant)) as web_order \gset

select tests.authenticate_as(:'admin_id', as_admin => true);
select (public.create_quick_sale(tests.items(:pickup_variant), 'Eva', '71234567', 'pickup_point')).id as pickup_order \gset
select (public.create_quick_sale(tests.items(:bus_variant), 'Luis', '61234567', 'bus_parcel', 'Oruro', 'Luis Rojas')).id as bus_order \gset
select public.cancel_order(:'web_order', 'Pidió cancelar por WhatsApp');

select is(
  (select array_agg(actor_label) from public.get_audit_log('orders', :'web_order')),
  array['Dueña CutePet', 'Cliente'],
  'the timeline names the admin and the customer, newest first');
select is(
  (select reason from public.get_audit_log('orders', :'web_order') limit 1),
  'Pidió cancelar por WhatsApp', 'the timeline keeps the reason');
select is(
  (select count(*)::integer from public.get_audit_log('orders', :'pickup_order')),
  1, 'filters by record');
select is((select count(*)::integer from public.get_audit_log(page_size => 2)), 2, 'pages are limited');
select is(
  (select count(*)::integer from public.get_audit_log('orders', :'web_order',
    before_id => (select min(id) from public.get_audit_log('orders', :'web_order')))),
  0, 'before_id continues after the last entry seen');
select is((select count(*)::integer from public.get_audit_log(from_date => current_date + 1)), 0,
  'filters by date');

select throws_ok(
  format('update public.orders set shipping_receipt_path = %L where id = %L', 'x/guia.jpg', :'pickup_order'),
  '23514', null, 'a pickup order cannot have a shipping receipt');
select lives_ok(
  format('update public.orders set shipping_receipt_path = %L where id = %L', :'bus_order' || '/guia.jpg', :'bus_order'),
  'admin attaches the shipping receipt of a bus parcel order');

select tests.clear_authentication();
select tests.authenticate_as(:'customer_id');
select throws_ok('select * from public.get_audit_log()', 'P0001', 'FORBIDDEN',
  'customers cannot read the audit log');
update public.orders set shipping_receipt_path = 'x/guia.jpg' where id = :'web_order';
select is((select shipping_receipt_path from public.orders where id = :'web_order'), null,
  'customers cannot attach shipping receipts');

select tests.clear_authentication();
select tests.authenticate_as_anon();
select throws_ok('select * from public.get_audit_log()', '42501', null,
  'anon cannot call get_audit_log');

select * from finish();
rollback;
