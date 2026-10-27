create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb,
  reason text,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create index audit_log_record_idx on public.audit_log (table_name, record_id, created_at);

alter table public.audit_log enable row level security;

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create policy "admin reads audit log" on public.audit_log
  for select to authenticated
  using ((select private.is_admin()));

create function private.set_audit_reason(reason text)
returns void
language sql
set search_path = ''
as $$
  select set_config('cutepet.reason', coalesce(reason, ''), true);
$$;

create function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_row jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and old_row = new_row then
    return null;
  end if;

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, reason, actor_id)
  values (
    tg_table_name,
    coalesce(new_row ->> 'id', old_row ->> 'id', new_row ->> 'user_id', old_row ->> 'user_id'),
    lower(tg_op),
    old_row,
    new_row,
    nullif(current_setting('cutepet.reason', true), ''),
    auth.uid()
  );

  return null;
end;
$$;

create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function private.audit_row();
create trigger audit_pet_types after insert or update or delete on public.pet_types
  for each row execute function private.audit_row();
create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function private.audit_row();
create trigger audit_sizes after insert or update or delete on public.sizes
  for each row execute function private.audit_row();
create trigger audit_products after insert or update or delete on public.products
  for each row execute function private.audit_row();
create trigger audit_product_photos after insert or update or delete on public.product_photos
  for each row execute function private.audit_row();
create trigger audit_variants after insert or update or delete on public.variants
  for each row execute function private.audit_row();
create trigger audit_settings after insert or update or delete on public.settings
  for each row execute function private.audit_row();
create trigger audit_orders after insert or update or delete on public.orders
  for each row execute function private.audit_row();
create trigger audit_order_items after insert or update or delete on public.order_items
  for each row execute function private.audit_row();
