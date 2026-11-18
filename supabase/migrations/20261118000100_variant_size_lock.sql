-- A variant's size can change only while no order uses it, so past orders keep the size they sold.
-- security definer so the check sees every order item regardless of the caller's RLS.
create function private.prevent_size_change_with_orders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.order_items oi where oi.variant_id = old.id) then
    perform private.raise_error('VARIANT_HAS_ORDERS');
  end if;

  return new;
end;
$$;

revoke execute on function private.prevent_size_change_with_orders() from public, anon, authenticated;

create trigger variants_size_locked_by_orders
  before update of size_id on public.variants
  for each row
  when (old.size_id is distinct from new.size_id)
  execute function private.prevent_size_change_with_orders();
