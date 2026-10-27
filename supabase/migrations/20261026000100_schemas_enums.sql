create schema private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter default privileges in schema private revoke execute on functions from public;

create type public.order_status as enum (
  'pending_payment',
  'proof_uploaded',
  'confirmed',
  'in_production',
  'ready_for_pickup',
  'shipped',
  'delivered',
  'cancelled'
);

create type public.order_channel as enum ('web', 'whatsapp');

create type public.delivery_method as enum ('pickup_point', 'bus_parcel');

create type public.availability as enum ('in_stock', 'made_to_order');

create type public.app_role as enum ('admin');

create function private.raise_error(error_code text, error_detail jsonb default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = error_code,
    detail = coalesce(error_detail::text, '');
end;
$$;
