create table public.settings (
  id boolean primary key default true check (id),
  qr_checkout_enabled boolean not null default false,
  qr_disabled_message text not null
    default 'El pago con QR no está disponible por ahora. Haz tu pedido por WhatsApp.',
  qr_image_path text,
  qr_expires_on date,
  reservation_minutes integer not null default 15 check (reservation_minutes between 5 and 120),
  validation_hours text not null default '',
  store_whatsapp text check (store_whatsapp ~ '^[0-9]{8,15}$'),
  pickup_address text not null default '',
  pickup_hours text not null default '',
  pickup_notice text not null default '',
  pickup_fee numeric(10, 2) not null default 2 check (pickup_fee >= 0),
  free_pickup_min_items integer not null default 3 check (free_pickup_min_items > 0),
  shipping_promo_enabled boolean not null default false,
  shipping_promo_min_items integer check (shipping_promo_min_items > 0),
  shipping_promo_min_total numeric(10, 2) check (shipping_promo_min_total > 0)
);

alter table public.settings enable row level security;

revoke all on public.settings from anon, authenticated;
grant select on public.settings to anon, authenticated;
grant update (
  qr_checkout_enabled, qr_disabled_message, qr_image_path, qr_expires_on, reservation_minutes,
  validation_hours, store_whatsapp, pickup_address, pickup_hours, pickup_notice, pickup_fee,
  free_pickup_min_items, shipping_promo_enabled, shipping_promo_min_items, shipping_promo_min_total
) on public.settings to authenticated;

create policy "everyone reads settings" on public.settings
  for select to anon, authenticated
  using (true);
create policy "admin updates settings" on public.settings
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

insert into public.settings default values;
