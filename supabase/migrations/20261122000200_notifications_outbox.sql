-- Step 7: notifications outbox.
-- The RPC that causes an event queues one row per subscribed channel, in its own transaction.
-- pg_net calls the notify Edge Function only after commit and never waits for it, so a
-- notification failure never blocks or rolls back an order. notify claims the rows, sends them
-- and records the result. A failed row is sent again up to 3 attempts in total.
-- Messages are rendered here, as Telegram HTML, so the templates are covered by pgTAP.

create extension if not exists pg_net with schema extensions;

create type public.notification_status as enum ('pending', 'sending', 'sent', 'failed');

create table public.notifications (
  id bigint generated always as identity primary key,
  event public.notification_event not null,
  channel_id bigint not null references public.notification_channels (id),
  message text not null,
  is_silent boolean not null default false,
  status public.notification_status not null default 'pending',
  attempts smallint not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz
);

create index notifications_channel_id_idx on public.notifications (channel_id, id desc);
create index notifications_unsent_idx on public.notifications (id) where status <> 'sent';

-- The messages hold customer names and phones: admins only, read only
alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
-- New tables are not exposed to the Data API by default, and finish_notification runs as service_role
grant select, update on public.notifications to service_role;

create policy "admin reads notifications" on public.notifications
  for select to authenticated
  using ((select private.is_admin()));

-- Each channel with its latest error, only while its latest delivery is the one that failed
create view public.notification_channels_overview
with (security_invoker = true)
as
select c.id, c.name, c.type, c.destination, c.events, c.is_active, c.created_at, latest.last_error
from public.notification_channels c
left join lateral (
  select n.status, n.last_error
  from public.notifications n
  where n.channel_id = c.id
  order by n.id desc
  limit 1
) latest on latest.status = 'failed';

revoke all on public.notification_channels_overview from anon, authenticated;
grant select on public.notification_channels_overview to authenticated;

-- Non secret values that differ per environment: notify_url and site_url
create function private.vault_value(secret_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ds.decrypted_secret from vault.decrypted_secrets ds where ds.name = secret_name;
$$;

create function private.html_escape(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(value, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

-- Same output as formatPrice in Angular: Bs 1.500 and Bs 120,50
create function private.format_bs(amount numeric)
returns text
language sql
stable
set search_path = ''
as $$
  select 'Bs ' || translate(
    to_char(amount, case when amount = trunc(amount) then 'FM999,999,990' else 'FM999,999,990.00' end),
    ',.', '.,'
  );
$$;

create function private.store_date_label(value date)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(value, 'DD/MM/YYYY');
$$;

create function private.store_time_label(value timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(value at time zone 'America/La_Paz', 'DD/MM/YYYY HH24:MI');
$$;

-- Without site_url the link is only the path, so the message still says where to look
create function private.admin_link(path text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(rtrim(private.vault_value('site_url'), '/'), '') || path;
$$;

create function private.poke_notify()
returns void
language plpgsql
set search_path = ''
as $$
declare
  notify_url text := private.vault_value('notify_url');
begin
  if notify_url is null then
    return;
  end if;

  perform net.http_post(
    url := notify_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 10000
  );
end;
$$;

-- Never raises: losing an alert is better than losing the order that caused it
create function private.enqueue_notification(
  event_type public.notification_event,
  message text,
  is_silent boolean default false
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  queued_count integer;
begin
  insert into public.notifications (event, channel_id, message, is_silent)
  select event_type, c.id, enqueue_notification.message, enqueue_notification.is_silent
  from public.notification_channels c
  where c.is_active
    and c.type = 'telegram'
    and event_type = any (c.events);

  get diagnostics queued_count = row_count;

  if queued_count > 0 then
    perform private.poke_notify();
  end if;

  return queued_count;
exception when others then
  raise warning 'notification not queued: %', sqlerrm;
  return 0;
end;
$$;

-- A row stuck in sending means notify stopped before recording the result
create function private.is_notification_due(row_to_check public.notifications)
returns boolean
language sql
stable
set search_path = ''
as $$
  select row_to_check.attempts < 3 and (
    row_to_check.status = 'pending'
    or row_to_check.status = 'failed'
    or (row_to_check.status = 'sending' and row_to_check.locked_at < now() - interval '5 minutes')
  );
$$;

create function public.claim_notifications()
returns table (id bigint, destination text, message text, is_silent boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notifications n
  set status = 'failed', last_error = 'notify no respondió', locked_at = null
  where n.status = 'sending' and n.attempts >= 3 and n.locked_at < now() - interval '5 minutes';

  return query
  with claimable as (
    select n.id
    from public.notifications n
    where n.status <> 'sent' and private.is_notification_due(n)
    order by n.id
    limit 20
    for update skip locked
  )
  update public.notifications n
  set status = 'sending', attempts = n.attempts + 1, locked_at = now()
  from claimable, public.notification_channels c
  where n.id = claimable.id and c.id = n.channel_id
  returning n.id, c.destination, n.message, n.is_silent;
end;
$$;

-- A success keeps the error of an earlier attempt as a record
create function public.finish_notification(notification_id bigint, error_message text default null)
returns void
language sql
set search_path = ''
as $$
  update public.notifications n
  set status = case when error_message is null then 'sent' else 'failed' end::public.notification_status,
      sent_at = case when error_message is null then now() end,
      last_error = coalesce(left(error_message, 300), n.last_error),
      locked_at = null
  where n.id = notification_id and n.status = 'sending';
$$;

revoke execute on function public.claim_notifications() from public, anon, authenticated;
revoke execute on function public.finish_notification(bigint, text) from public, anon, authenticated;
grant execute on function public.claim_notifications() to service_role;
grant execute on function public.finish_notification(bigint, text) to service_role;

-- Goes through the real path, also for an inactive channel so it can be tested before turning it on
create function public.send_test_notification(channel_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  channel public.notification_channels;
  notification_id bigint;
begin
  perform private.require_admin();

  select * into channel from public.notification_channels c where c.id = send_test_notification.channel_id;

  if channel.id is null or channel.type <> 'telegram' then
    perform private.raise_error('CHANNEL_NOT_FOUND');
  end if;

  insert into public.notifications (event, channel_id, message)
  values (
    'channel_test',
    channel.id,
    '✅ <b>Prueba de CutePet</b>' || E'\n'
      || 'Este canal recibe los avisos de la tienda: ' || private.html_escape(channel.name) || '.'
  )
  returning id into notification_id;

  perform private.poke_notify();
  return notification_id;
end;
$$;

revoke execute on function public.send_test_notification(bigint) from public, anon;
grant execute on function public.send_test_notification(bigint) to authenticated;

-- Returns true when it called notify
create function private.retry_notifications()
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.notifications n where n.status <> 'sent' and private.is_notification_due(n)
  ) then
    return false;
  end if;

  perform private.poke_notify();
  return true;
end;
$$;

select cron.schedule('retry-notifications', '*/5 * * * *', 'select private.retry_notifications()');
