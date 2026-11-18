-- Audit entries for the panel with a readable actor. Admins cannot read auth.users, and should not:
-- this function returns only a label (the admin's Google name or email, "Cliente" or "Sistema").
create function public.get_audit_log(
  target_table text default null,
  target_record_id text default null,
  from_date date default null,
  to_date date default null,
  before_id bigint default null,
  page_size integer default 50
)
returns table (
  id bigint,
  table_name text,
  record_id text,
  action text,
  old_data jsonb,
  new_data jsonb,
  reason text,
  actor_label text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  return query
  select
    a.id,
    a.table_name,
    a.record_id,
    a.action,
    a.old_data,
    a.new_data,
    a.reason,
    case
      when a.actor_id is null then 'Sistema'
      when ur.user_id is not null then coalesce(
        u.raw_user_meta_data ->> 'full_name',
        u.raw_user_meta_data ->> 'name',
        u.email,
        'Admin'
      )
      else 'Cliente'
    end,
    a.created_at
  from public.audit_log a
  left join public.user_roles ur on ur.user_id = a.actor_id
  left join auth.users u on u.id = a.actor_id
  where (target_table is null or a.table_name = target_table)
    and (target_record_id is null or a.record_id = target_record_id)
    and (from_date is null or a.created_at >= from_date::timestamptz)
    and (to_date is null or a.created_at < (to_date + 1)::timestamptz)
    and (before_id is null or a.id < before_id)
  order by a.id desc
  limit least(greatest(coalesce(page_size, 50), 1), 100);
end;
$$;

revoke execute on function public.get_audit_log(text, text, date, date, bigint, integer) from public, anon;
grant execute on function public.get_audit_log(text, text, date, date, bigint, integer) to authenticated;

-- A shipping receipt only makes sense for bus parcel orders.
alter table public.orders
  add constraint orders_shipping_receipt_only_bus_parcel
  check (shipping_receipt_path is null or delivery_method = 'bus_parcel');
