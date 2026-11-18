-- Deactivating a category, pet type or size never changes products that already use it: they stay
-- on sale with it. So everyone can read inactive rows too (they are public catalog data), and the
-- store asks for active ones only where it builds filters and options.
drop policy "everyone reads active pet types" on public.pet_types;
create policy "everyone reads pet types" on public.pet_types
  for select to anon, authenticated
  using (true);

drop policy "everyone reads active categories" on public.categories;
create policy "everyone reads categories" on public.categories
  for select to anon, authenticated
  using (true);

drop policy "everyone reads active sizes" on public.sizes;
create policy "everyone reads sizes" on public.sizes
  for select to anon, authenticated
  using (true);
