begin;
select plan(24);

select tests.set_settings('{"qr_checkout_enabled": true}');
select tests.create_variant() as visible_variant \gset
select tests.create_variant(is_active => false) as hidden_variant \gset
select tests.create_user('customer-a@test.bo') as customer_a \gset
select tests.create_user('customer-b@test.bo') as customer_b \gset
select tests.create_user('admin@test.bo') as admin_id \gset
select tests.reserve(:'customer_a', tests.items(:visible_variant)) as order_a \gset

select tests.authenticate_as_anon();

select is((select count(*)::integer from public.variants where id = :visible_variant), 1,
  'anon sees variants of active products');
select is((select count(*)::integer from public.variants where id = :hidden_variant), 0,
  'anon does not see variants of inactive products');
select is((select count(*)::integer from public.settings), 1, 'anon reads settings');
select is((select available_stock from public.catalog_variants where id = :visible_variant), 0,
  'anon sees a reserved unique item as unavailable');
select throws_ok('select * from public.orders', '42501', null, 'anon cannot read orders');
select throws_ok(
  format('select public.reserve_order(%L::jsonb, %L, %L, %L)',
    tests.items(:visible_variant), 'Eva', '71234567', 'pickup_point'),
  '42501', null, 'anon cannot call reserve_order');

select tests.clear_authentication();
select tests.authenticate_as(:'customer_b');

select is((select count(*)::integer from public.orders), 0, 'a customer does not see orders of others');
select is((select count(*)::integer from public.order_items), 0, 'a customer does not see items of others');
select throws_ok(
  $$insert into public.orders (channel, status, customer_name, customer_phone, delivery_method, items_total)
    values ('web', 'confirmed', 'Eva', '71234567', 'pickup_point', 0)$$,
  '42501', null, 'customers cannot insert orders directly');
select throws_ok(format('update public.variants set stock = 5 where id = %s', :visible_variant),
  '42501', null, 'customers cannot update stock');
select is((select count(*)::integer from public.audit_log), 0, 'customers cannot read the audit log');
select throws_ok('select * from public.user_roles', '42501', null, 'customers cannot read roles');
update public.settings set qr_checkout_enabled = false;

select tests.clear_authentication();
select is((select qr_checkout_enabled from public.settings), true, 'customers cannot change settings');

select tests.authenticate_as(:'customer_a');

select is((select count(*)::integer from public.orders where id = :'order_a'), 1, 'the owner sees the order');
select is((select count(*)::integer from public.order_items where order_id = :'order_a'), 1,
  'the owner sees the order items');
select throws_ok(format('select public.confirm_order(%L)', :'order_a'), 'P0001', 'FORBIDDEN',
  'customers cannot confirm orders');

select tests.clear_authentication();
select tests.authenticate_as(:'admin_id', true);

select is((select count(*)::integer from public.orders where id = :'order_a'), 1, 'admin sees every order');
select lives_ok(
  format('update public.products set name = %L where id = (select product_id from public.variants where id = %s)',
    'Nuevo nombre', :visible_variant),
  'admin edits products');
select throws_ok(format('update public.variants set stock = 9 where id = %s', :visible_variant),
  '42501', null, 'admins change stock only through adjust_stock');
select throws_ok(
  format('delete from public.products where id = (select product_id from public.variants where id = %s)',
    :visible_variant),
  '42501', null, 'nobody deletes products');
select ok((select count(*) from public.audit_log) > 0, 'admin reads the audit log');

select tests.clear_authentication();

insert into public.user_roles (user_id, role) values (:'admin_id', 'admin');

select is(
  public.custom_access_token_hook(jsonb_build_object('user_id', :'admin_id', 'claims', '{"app_metadata":{}}'::jsonb))
    -> 'claims' -> 'app_metadata' ->> 'role',
  'admin', 'the auth hook adds the admin role');
select is(
  public.custom_access_token_hook(
    jsonb_build_object('user_id', :'customer_a', 'claims', '{"app_metadata":{"role":"admin"}}'::jsonb))
    -> 'claims' -> 'app_metadata' ->> 'role',
  null, 'the auth hook removes a role that is not in user_roles');

select tests.authenticate_as(:'customer_a');
select throws_ok(
  format('select public.custom_access_token_hook(%L::jsonb)', jsonb_build_object('user_id', :'customer_a', 'claims', '{}'::jsonb)),
  '42501', null, 'clients cannot call the auth hook');
select tests.clear_authentication();

select * from finish();
rollback;
