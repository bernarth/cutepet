begin;
select plan(8);

select tests.create_user('admin@test.bo') as admin_id \gset
select tests.create_variant(stock => 1) as variant_id \gset
select v.product_id, p.category_id, p.pet_type_id, v.size_id
from public.variants v join public.products p on p.id = v.product_id
where v.id = :variant_id \gset

select tests.authenticate_as(:'admin_id', as_admin => true);
select lives_ok(
  format('update public.categories set active = false where id = %s', :category_id),
  'admin deactivates a category');
select lives_ok(
  format('update public.pet_types set active = false where id = %s', :pet_type_id),
  'admin deactivates a pet type');
select lives_ok(
  format('update public.sizes set active = false where id = %s', :size_id),
  'admin deactivates a size');
select throws_ok(
  format('delete from public.categories where id = %s', :category_id),
  '42501', null, 'categories are never deleted');

select tests.clear_authentication();
select tests.authenticate_as_anon();

select is(
  (select count(*)::integer from public.products p
   join public.categories c on c.id = p.category_id
   join public.pet_types t on t.id = p.pet_type_id
   where p.id = :product_id),
  1, 'a product keeps showing with its deactivated category and pet type');
select is(
  (select catalog_status::text from public.catalog_products where id = :product_id),
  'available', 'the product stays on sale');
select is(
  (select s.label from public.catalog_variants v join public.sizes s on s.id = v.size_id
   where v.id = :variant_id),
  '1', 'its size still shows its label');
select throws_ok(
  format('update public.categories set active = true where id = %s', :category_id),
  '42501', null, 'visitors cannot change categories');

select * from finish();
rollback;
