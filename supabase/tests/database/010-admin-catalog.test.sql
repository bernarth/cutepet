begin;
select plan(9);

select tests.create_user('admin@test.bo') as admin_id \gset
select tests.create_user('customer@test.bo') as customer_id \gset
select tests.create_variant() as sold_variant \gset
select tests.create_variant() as new_variant \gset
select id as size_two from public.sizes where label = '2' \gset
select id as size_three from public.sizes where label = '3' \gset

select tests.authenticate_as(:'admin_id', as_admin => true);
select public.create_quick_sale(tests.items(:sold_variant), 'Eva', '71234567', 'pickup_point');

select lives_ok(
  format('update public.variants set size_id = %s where id = %s', :size_two, :new_variant),
  'admin changes the size of a variant without orders');
select throws_ok(
  format('update public.variants set size_id = %s where id = %s', :size_three, :sold_variant),
  'P0001', 'VARIANT_HAS_ORDERS', 'admin cannot change the size of a variant with orders');
select lives_ok(
  format('update public.variants set chest_cm = 42, tolerance_cm = 3 where id = %s', :sold_variant),
  'admin still edits the measurements of a variant with orders');
select throws_ok(
  format('update public.variants set stock = 9 where id = %s', :new_variant),
  '42501', null, 'stock changes only through adjust_stock');
select throws_ok(
  format('delete from public.variants where id = %s', :new_variant),
  '42501', null, 'variants are never deleted');
select throws_ok(
  format('delete from public.products where id = (select product_id from public.variants where id = %s)', :new_variant),
  '42501', null, 'products are never deleted');
select lives_ok(
  format('update public.products set is_active = false where id = (select product_id from public.variants where id = %s)', :new_variant),
  'admin archives a product');

select tests.clear_authentication();
select tests.authenticate_as(:'customer_id');

select is(
  (select count(*)::integer from public.products p
   join public.variants v on v.product_id = p.id where v.id = :new_variant),
  0, 'customers do not see archived products');
select throws_ok(
  format('select public.create_quick_sale(%L::jsonb, %L, %L, %L)', tests.items(:new_variant), 'Eva', '71234567', 'pickup_point'),
  'P0001', 'FORBIDDEN', 'customers cannot record quick sales');

select * from finish();
rollback;
