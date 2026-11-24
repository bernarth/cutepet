-- Step 8: linking a guest to a Google account.
-- A new Google account is linked to the guest, so nothing moves. When the account already exists
-- the guest cannot be linked, so the guest first gets a one time token and the account uses it
-- after sign-in to receive the guest orders. Only the hash of the token is stored.
-- The 24 hours apply to the first use. That use ties the transfer to one account, which can finish
-- it later without the token when both sides had a pending payment.

create table private.guest_transfers (
  id bigint generated always as identity primary key,
  guest_id uuid not null unique references auth.users (id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  account_id uuid references auth.users (id) on delete cascade,
  moved_count integer,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index guest_transfers_account_id_idx on private.guest_transfers (account_id);

-- Only the two functions below reach this table
alter table private.guest_transfers enable row level security;
revoke all on private.guest_transfers from public, anon, authenticated, service_role;

-- Tokens always carry is_anonymous. A token without it is not trusted as a permanent account
create function private.is_permanent_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean is false, false);
$$;

create function private.is_guest(user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from auth.users u where u.id = user_id and u.is_anonymous);
$$;

create function private.transfer_token_hash(transfer_token text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select sha256(convert_to(transfer_token, 'UTF8'));
$$;

-- A new token replaces the previous one of the same guest
create function public.start_guest_transfer()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  transfer_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if caller is null then
    perform private.raise_error('NOT_AUTHENTICATED');
  end if;

  if private.is_permanent_user() or not private.is_guest(caller) then
    perform private.raise_error('FORBIDDEN');
  end if;

  insert into private.guest_transfers (guest_id, token_hash, expires_at)
  values (caller, private.transfer_token_hash(transfer_token), now() + interval '24 hours')
  on conflict (guest_id) do update
  set token_hash = excluded.token_hash,
      expires_at = excluded.expires_at,
      account_id = null,
      moved_count = null,
      completed_at = null,
      created_at = now();

  return transfer_token;
end;
$$;

-- All the orders of the guest move or none does. A customer can have only one pending payment, so
-- when both sides have one nothing moves. Returns null in that case
create function private.move_guest_orders(target private.guest_transfers)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  moved integer;
begin
  perform private.set_audit_reason('guest_orders_transferred');

  update public.orders o
  set customer_id = target.account_id
  where o.customer_id = target.guest_id;

  get diagnostics moved = row_count;
  perform private.set_audit_reason(null);

  update private.guest_transfers t
  set moved_count = moved, completed_at = now()
  where t.id = target.id;

  return moved;
exception when unique_violation then
  return null;
end;
$$;

-- With a token: ties the transfer to the caller and moves the orders. Repeating it is safe.
-- Without a token: finishes a transfer that was already tied to the caller.
-- outcome is moved, pending_conflict or nothing
create function public.transfer_guest_orders(transfer_token text default null)
returns table (outcome text, moved_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target private.guest_transfers;
  moved integer;
begin
  if caller is null then
    perform private.raise_error('NOT_AUTHENTICATED');
  end if;

  if not private.is_permanent_user() then
    perform private.raise_error('FORBIDDEN');
  end if;

  perform private.expire_stale_orders();

  if transfer_token is null then
    select t.* into target
    from private.guest_transfers t
    where t.account_id = caller and t.completed_at is null and private.is_guest(t.guest_id)
    order by t.id
    limit 1
    for update;

    if not found then
      return query select 'nothing', 0;
      return;
    end if;
  else
    select t.* into target
    from private.guest_transfers t
    where t.token_hash = private.transfer_token_hash(transfer_token)
    for update;

    if not found
      or target.account_id <> caller
      or (target.account_id is null and target.expires_at <= now()) then
      perform private.raise_error('TRANSFER_INVALID');
    end if;
  end if;

  if target.completed_at is not null then
    return query select 'moved', target.moved_count;
    return;
  end if;

  -- A guest who linked a Google account meanwhile keeps the orders there
  if not private.is_guest(target.guest_id) then
    perform private.raise_error('TRANSFER_INVALID');
  end if;

  update private.guest_transfers t
  set account_id = caller
  where t.id = target.id
  returning t.* into target;

  moved := private.move_guest_orders(target);
  return query select case when moved is null then 'pending_conflict' else 'moved' end, coalesce(moved, 0);
end;
$$;

revoke execute on function private.is_permanent_user() from public;
revoke execute on function private.is_guest(uuid) from public;
revoke execute on function private.transfer_token_hash(text) from public;
revoke execute on function private.move_guest_orders(private.guest_transfers) from public;
revoke execute on function public.start_guest_transfer() from public, anon;
revoke execute on function public.transfer_guest_orders(text) from public, anon;
grant execute on function public.start_guest_transfer() to authenticated;
grant execute on function public.transfer_guest_orders(text) to authenticated;
