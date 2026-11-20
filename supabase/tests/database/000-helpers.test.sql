create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.create_user(email text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into auth.users (id, instance_id, aud, role, email)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email)
  returning id;
$$;

create or replace function tests.authenticate_as(user_id uuid, as_admin boolean default false)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_id,
    'role', 'authenticated',
    'app_metadata', case when as_admin then json_build_object('role', 'admin') else '{}'::json end
  )::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- A guest from signInAnonymously: same authenticated role, with the is_anonymous claim
create or replace function tests.create_guest()
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into auth.users (id, instance_id, aud, role, is_anonymous)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true)
  returning id;
$$;

create or replace function tests.authenticate_as_guest(user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_id,
    'role', 'authenticated',
    'is_anonymous', true,
    'app_metadata', '{}'::json
  )::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

create or replace function tests.clear_authentication()
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  reset role;
end;
$$;

create or replace function tests.create_variant(
  price numeric default 100,
  stock integer default 1,
  is_active boolean default true
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_id bigint;
  product_id bigint;
  variant_id bigint;
  suffix text := replace(gen_random_uuid()::text, '-', '');
begin
  insert into public.categories (name, slug) values ('Test', 'test-' || suffix)
  returning id into category_id;

  insert into public.products (
    name, slug, pet_type_id, category_id, price, is_active
  ) values (
    'Prenda ' || suffix, 'prenda-' || suffix,
    (select pt.id from public.pet_types pt where pt.slug = 'perro'),
    category_id, price, is_active
  )
  returning id into product_id;

  insert into public.variants (product_id, size_id, stock)
  values (product_id, (select s.id from public.sizes s where s.label = '1'), stock)
  returning id into variant_id;

  return variant_id;
end;
$$;

create or replace function tests.items(variadic variant_ids bigint[])
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_agg(jsonb_build_object('variant_id', v, 'quantity', 1)) from unnest(variant_ids) v;
$$;

create or replace function tests.set_settings(changes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.settings s
  set qr_checkout_enabled = coalesce((changes ->> 'qr_checkout_enabled')::boolean, s.qr_checkout_enabled),
      free_pickup_min_items = coalesce((changes ->> 'free_pickup_min_items')::integer, s.free_pickup_min_items),
      pickup_fee = coalesce((changes ->> 'pickup_fee')::numeric, s.pickup_fee),
      reservation_minutes = coalesce((changes ->> 'reservation_minutes')::integer, s.reservation_minutes),
      shipping_promo_enabled = coalesce((changes ->> 'shipping_promo_enabled')::boolean, s.shipping_promo_enabled),
      shipping_promo_min_items = coalesce((changes ->> 'shipping_promo_min_items')::integer, s.shipping_promo_min_items),
      shipping_promo_min_total = coalesce((changes ->> 'shipping_promo_min_total')::numeric, s.shipping_promo_min_total),
      qr_image_path = case when changes ? 'qr_image_path' then changes ->> 'qr_image_path' else s.qr_image_path end,
      qr_expires_on = case when changes ? 'qr_expires_on' then (changes ->> 'qr_expires_on')::date else s.qr_expires_on end;
end;
$$;

create or replace function tests.reserve(customer uuid, items jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  order_id uuid;
begin
  perform tests.authenticate_as(customer);
  select o.id into order_id
  from public.reserve_order(items, 'Ana Pérez', '71234567', 'pickup_point') o;
  perform tests.clear_authentication();
  return order_id;
end;
$$;

create or replace function tests.upload_proof(order_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  insert into storage.objects (bucket_id, name)
  values ('payment-proofs', order_id::text || '/proof-' || gen_random_uuid()::text || '.jpg')
  returning name;
$$;

create or replace function tests.expire_reservation(order_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders o set reserved_until = now() - interval '1 minute' where o.id = order_id;
$$;

create or replace function tests.order_row(order_id uuid)
returns public.orders
language sql
security definer
set search_path = ''
as $$
  select * from public.orders o where o.id = order_id;
$$;

create or replace function tests.stock_of(variant_id bigint)
returns integer
language sql
security definer
set search_path = ''
as $$
  select v.stock from public.variants v where v.id = variant_id;
$$;

create or replace function tests.error_detail(statement text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  detail text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics detail = pg_exception_detail;
  return nullif(detail, '')::jsonb;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

select plan(1);
select pass('test helpers installed');
select * from finish();
