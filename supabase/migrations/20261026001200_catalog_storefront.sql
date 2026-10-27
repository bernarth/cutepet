create type public.catalog_status as enum ('available', 'reserved', 'sold_out', 'made_to_order');

alter table public.settings
  add column size_tolerance_cm numeric(4, 1) not null default 2 check (size_tolerance_cm > 0);

grant update (size_tolerance_cm) on public.settings to authenticated;

alter table public.variants
  add column tolerance_cm numeric(4, 1) check (tolerance_cm > 0);

grant update (tolerance_cm) on public.variants to authenticated;

create or replace view public.catalog_variants with (security_invoker = true) as
select
  v.id,
  v.product_id,
  v.size_id,
  v.neck_cm,
  v.chest_cm,
  v.back_length_cm,
  v.stock,
  greatest(v.stock - private.held_quantity(v.id), 0) as available_stock,
  v.tolerance_cm
from public.variants v;

insert into public.categories (name, slug, sort_order) values
  ('Abrigos', 'abrigos', 1),
  ('Vestidos', 'vestidos', 2),
  ('Otros', 'otros', 3);

create view public.catalog_products with (security_invoker = true) as
select
  p.id,
  p.name,
  p.slug,
  p.description,
  p.pet_type_id,
  p.category_id,
  p.price,
  p.availability,
  p.production_days,
  p.is_featured,
  p.created_at,
  case
    when p.availability = 'made_to_order' then 'made_to_order'
    when totals.available_units > 0 then 'available'
    when totals.stock_units > 0 then 'reserved'
    else 'sold_out'
  end::public.catalog_status as catalog_status,
  totals.size_ids
from public.products p
cross join lateral (
  select
    sum(cv.stock) as stock_units,
    sum(cv.available_stock) as available_units,
    coalesce(
      array_agg(cv.size_id order by cv.size_id)
        filter (where p.availability = 'made_to_order' or cv.available_stock > 0),
      '{}'
    ) as size_ids
  from public.catalog_variants cv
  where cv.product_id = p.id
) totals
where totals.stock_units is not null;

revoke all on public.catalog_products from anon, authenticated;
grant select on public.catalog_products to anon, authenticated;
