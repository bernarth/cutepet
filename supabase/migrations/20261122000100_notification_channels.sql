-- Step 7: notification channels.
-- A channel is one recipient of the owner alerts. Channels are never deleted, only deactivated.
-- The email type is kept for the email step; nothing is sent to email channels yet.

create type public.notification_channel_type as enum ('telegram', 'email');

-- channel_test is only queued by send_test_notification; channels cannot subscribe to it
create type public.notification_event as enum ('proof_uploaded', 'qr_expiry', 'channel_test');

create table public.notification_channels (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  type public.notification_channel_type not null,
  destination text not null,
  events public.notification_event[] not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint notification_channels_destination check (
    (type = 'telegram' and destination ~ '^-?[0-9]{1,20}$')
    or (
      type = 'email'
      and char_length(destination) <= 254
      and destination ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    )
  ),
  constraint notification_channels_events check (
    cardinality(events) > 0 and not ('channel_test' = any (events))
  ),
  constraint notification_channels_type_destination_key unique (type, destination)
);

alter table public.notification_channels enable row level security;

revoke all on public.notification_channels from anon, authenticated;
grant select, insert (name, type, destination, events, is_active) on public.notification_channels to authenticated;
grant update (name, destination, events, is_active) on public.notification_channels to authenticated;

create policy "admin reads notification channels" on public.notification_channels
  for select to authenticated
  using ((select private.is_admin()));

create policy "admin adds notification channels" on public.notification_channels
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "admin updates notification channels" on public.notification_channels
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create trigger audit_notification_channels after insert or update or delete on public.notification_channels
  for each row execute function private.audit_row();
