begin;
select plan(11);

select tests.set_settings('{"qr_checkout_enabled": true, "qr_image_path": "qr/test.png", "qr_expires_on": null}');
select tests.create_variant() as available_variant \gset
select tests.create_variant() as reserved_variant \gset
select tests.create_variant(stock => 0) as sold_variant \gset
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
  array[(select size_id from product_of where variant_id = :reserved_variant)],
  'a reserved size still matches the size filter');
select is(
  (select catalog_status from public.catalog_products
    where id = (select product_id from product_of where variant_id = :sold_variant)),
  'sold_out', 'a product with every variant at zero is sold out');
select is(
  (select count(*)::integer from public.catalog_products
    where id = (select product_id from product_of where variant_id = :hidden_variant)),
  0, 'anon does not see inactive products');
select is((select count(*)::integer from public.catalog_products where slug = 'sin-tallas'), 0,
  'products without variants are left out');
select ok(
  'available'::public.catalog_status < 'reserved' and 'reserved'::public.catalog_status < 'sold_out',
  'ordering by catalog_status lists available items before reserved ones');
select col_default_is('public', 'settings', 'size_tolerance_cm', '2'::text,
  'the default size tolerance is 2 cm');
select is(
  (select array_agg(slug order by sort_order) from public.categories
    where slug in ('abrigos', 'vestidos', 'otros')),
  array['abrigos', 'vestidos', 'otros'], 'categories are seeded');

select tests.clear_authentication();
select tests.create_user('admin@test.bo') as admin_id \gset
select tests.authenticate_as(:'admin_id', true);
select public.adjust_stock(:sold_variant, 1, 'Llegó una prenda devuelta');
select tests.clear_authentication();
select tests.authenticate_as_anon();
select is(
  (select catalog_status from public.catalog_products
    where id = (select product_id from product_of where variant_id = :sold_variant)),
  'available', 'adding stock makes a sold out product visible again');

select * from finish();
rollback;
