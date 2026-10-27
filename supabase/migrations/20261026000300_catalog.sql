create table public.pet_types (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.categories (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.sizes (
  id bigint generated always as identity primary key,
  label text not null unique check (char_length(label) between 1 and 10),
  sort_order integer not null unique,
  neck_min numeric(5, 1) not null,
  neck_max numeric(5, 1) not null,
  chest_min numeric(5, 1) not null,
  chest_max numeric(5, 1) not null,
  back_length_min numeric(5, 1) not null,
  back_length_max numeric(5, 1) not null,
  active boolean not null default true,
  constraint sizes_neck_range check (neck_min > 0 and neck_min <= neck_max),
  constraint sizes_chest_range check (chest_min > 0 and chest_min <= chest_max),
  constraint sizes_back_length_range check (back_length_min > 0 and back_length_min <= back_length_max)
);

create table public.products (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  pet_type_id bigint not null references public.pet_types (id),
  category_id bigint not null references public.categories (id),
  price numeric(10, 2) not null check (price > 0),
  availability public.availability not null default 'in_stock',
  production_days integer check (production_days > 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  constraint products_production_days_required
    check (availability = 'in_stock' or production_days is not null)
);

create index products_pet_type_id_idx on public.products (pet_type_id);
create index products_category_id_idx on public.products (category_id);

create table public.product_photos (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id),
  storage_path text not null check (char_length(storage_path) > 0),
  alt_text text not null check (char_length(alt_text) > 0),
  sort_order integer not null default 0
);

create index product_photos_product_id_idx on public.product_photos (product_id);

create table public.variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id),
  size_id bigint not null references public.sizes (id),
  neck_cm numeric(5, 1) check (neck_cm > 0),
  chest_cm numeric(5, 1) check (chest_cm > 0),
  back_length_cm numeric(5, 1) check (back_length_cm > 0),
  stock integer not null default 0 check (stock >= 0),
  unique (product_id, size_id)
);

create index variants_size_id_idx on public.variants (size_id);

alter table public.pet_types enable row level security;
alter table public.categories enable row level security;
alter table public.sizes enable row level security;
alter table public.products enable row level security;
alter table public.product_photos enable row level security;
alter table public.variants enable row level security;

revoke all on public.pet_types, public.categories, public.sizes, public.products,
  public.product_photos, public.variants from anon, authenticated;

grant select on public.pet_types, public.categories, public.sizes, public.products,
  public.product_photos, public.variants to anon, authenticated;

grant insert, update on public.pet_types, public.categories, public.sizes, public.products
  to authenticated;
grant insert, update, delete on public.product_photos to authenticated;
grant insert on public.variants to authenticated;
grant update (size_id, neck_cm, chest_cm, back_length_cm) on public.variants to authenticated;

create policy "everyone reads active pet types" on public.pet_types
  for select to anon, authenticated
  using (active or (select private.is_admin()));
create policy "admin creates pet types" on public.pet_types
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "admin updates pet types" on public.pet_types
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "everyone reads active categories" on public.categories
  for select to anon, authenticated
  using (active or (select private.is_admin()));
create policy "admin creates categories" on public.categories
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "admin updates categories" on public.categories
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "everyone reads active sizes" on public.sizes
  for select to anon, authenticated
  using (active or (select private.is_admin()));
create policy "admin creates sizes" on public.sizes
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "admin updates sizes" on public.sizes
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "everyone reads active products" on public.products
  for select to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy "admin creates products" on public.products
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "admin updates products" on public.products
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "everyone reads photos of visible products" on public.product_photos
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "admin creates photos" on public.product_photos
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "admin updates photos" on public.product_photos
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "admin deletes photos" on public.product_photos
  for delete to authenticated
  using ((select private.is_admin()));

create policy "everyone reads variants of visible products" on public.variants
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "admin creates variants" on public.variants
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "admin updates variants" on public.variants
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

insert into public.pet_types (name, slug, sort_order) values
  ('Perro', 'perro', 1),
  ('Gato', 'gato', 2);

insert into public.sizes (
  label, sort_order, neck_min, neck_max, chest_min, chest_max, back_length_min, back_length_max
) values
  ('000', 1, 17, 20, 25, 29, 15, 19),
  ('00', 2, 21, 23, 30, 34, 20, 24),
  ('0', 3, 24, 26, 35, 39, 25, 29),
  ('1', 4, 27, 29, 40, 44, 30, 34),
  ('2', 5, 30, 32, 45, 49, 35, 39),
  ('3', 6, 33, 35, 50, 54, 40, 44),
  ('4', 7, 36, 38, 55, 59, 45, 49),
  ('5', 8, 39, 44, 60, 67, 50, 54),
  ('6', 9, 45, 49, 68, 75, 55, 59),
  ('7', 10, 50, 54, 76, 83, 60, 64);
