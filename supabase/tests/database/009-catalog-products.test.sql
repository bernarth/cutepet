begin;
select plan(11);

select tests.set_settings('{"qr_checkout_enabled": true}');
select tests.create_variant() as available_variant \gset
select tests.create_variant() as reserved_variant \gset
select tests.create_variant(stock => 0) as sold_variant \gset
select tests.create_variant(stock => 0, availability => 'made_to_order') as made_to_order_variant \gset
select tests.create_variant(is_active => false) as hidden_variant \gset
select tests.create_user('customer@test.bo') as customer_id \gset
select tests.reserve(:'customer_id', tests.items(:reserved_variant)) as reserved_order \gset

insert into public.products (name, slug, pet_type_id, category_id, price)
values ('Sin tallas', 'sin-tallas', (select id from public.pet_types where slug = 'perro'),
  (select id from public.categories where slug = 'otros'), 50);

create temporary table product_of as
select v.id as variant_id, v.product_id, v.size_id from public.variants v;
grant select on product_of to anon;

select tests.authenticate_as_anon();

select is(
  (select catalog_status from public.catalog_products
    where id = (select product_id from product_of where variant_id = :available_variant)),
  'available', 'a product with free stock is available');
select is(
  (select size_ids from public.catalog_products
    where id = (select product_id from product_of where variant_id = :available_variant)),
  array[(select size_id from product_of where variant_id = :available_variant)],
  'an available product lists its free sizes');
select is(
  (select catalog_status from public.catalog_products
    where id = (select product_id from product_of where variant_id = :reserved_variant)),
  'reserved', 'a product held by an active order is reserved');
select is(
  (select size_ids from public.catalog_products
    where id = (select product_id from product_of where variant_id = :reserved_variant)),
  '{}'::bigint[], 'a reserved size cannot be picked');
select is(
  (select catalog_status from public.catalog_products
    where id = (select product_id from product_of where variant_id = :sold_variant)),
  'sold_out', 'a product with every variant at zero is sold out');
select is(
  (select catalog_status from public.catalog_products
    where id = (select product_id from product_of where variant_id = :made_to_order_variant)),
  'made_to_order', 'a made-to-order product is never sold out');
select is(
  (select size_ids from public.catalog_products
    where id = (select product_id from product_of where variant_id = :made_to_order_variant)),
  array[(select size_id from product_of where variant_id = :made_to_order_variant)],
  'a made-to-order product lists every size it has');
select is(
  (select count(*)::integer from public.catalog_products
    where id = (select product_id from product_of where variant_id = :hidden_variant)),
  0, 'anon does not see inactive products');
select is((select count(*)::integer from public.catalog_products where slug = 'sin-tallas'), 0,
  'products without variants are left out');
select is((select size_tolerance_cm from public.settings), 2.0, 'the default size tolerance is 2 cm');
select is(
  (select array_agg(slug order by sort_order) from public.categories
    where slug in ('abrigos', 'vestidos', 'otros')),
  array['abrigos', 'vestidos', 'otros'], 'categories are seeded');

select * from finish();
rollback;
