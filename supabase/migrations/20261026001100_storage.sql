insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('store-images', 'store-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('payment-proofs', 'payment-proofs', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('shipping-receipts', 'shipping-receipts', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

create function private.can_upload_payment_proof(target_order_id text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id::text = target_order_id
      and o.customer_id = (select auth.uid())
      and (
        o.status = 'pending_payment'
        or (o.status = 'cancelled' and o.cancel_reason = 'reservation_expired')
      )
  );
$$;

grant execute on function private.can_upload_payment_proof(text) to authenticated;

create policy "admin manages store images" on storage.objects
  for all to authenticated
  using (bucket_id = 'store-images' and (select private.is_admin()))
  with check (bucket_id = 'store-images' and (select private.is_admin()));

create policy "owner uploads payment proof" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and private.can_upload_payment_proof((storage.foldername(name))[1])
  );

create policy "owner or admin reads payment proofs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      (select private.is_admin())
      or exists (
        select 1 from public.orders o
        where o.id::text = (storage.foldername(name))[1]
          and o.customer_id = (select auth.uid())
      )
    )
  );

create policy "admin uploads shipping receipts" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shipping-receipts' and (select private.is_admin()));

create policy "owner or admin reads shipping receipts" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shipping-receipts'
    and (
      (select private.is_admin())
      or exists (
        select 1 from public.orders o
        where o.id::text = (storage.foldername(name))[1]
          and o.customer_id = (select auth.uid())
      )
    )
  );
