create function private.parse_items(items jsonb)
returns table (variant_id bigint, quantity integer)
language sql
immutable
set search_path = ''
as $$
  select (item ->> 'variant_id')::bigint, sum((item ->> 'quantity')::integer)::integer
  from jsonb_array_elements(items) as item
  group by 1;
$$;

create function private.order_stock_items(target_order_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('variant_id', oi.variant_id, 'quantity', oi.quantity)),
    '[]'::jsonb
  )
  from public.order_items oi
  where oi.order_id = target_order_id and not oi.is_made_to_order;
$$;

create function private.held_quantity(target_variant_id bigint, ignored_order_id uuid default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(oi.quantity), 0)::integer
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.variant_id = target_variant_id
    and not oi.is_made_to_order
    and not o.needs_attention
    and o.id is distinct from ignored_order_id
    and (
      o.status = 'proof_uploaded'
      or (o.status = 'pending_payment' and o.reserved_until > now())
    );
$$;

grant execute on function private.held_quantity(bigint, uuid) to anon, authenticated;

create function private.lock_variants(variant_ids bigint[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.variants v where v.id = any(variant_ids) order by v.id for update;
end;
$$;

create function private.unavailable_items(items jsonb, ignored_order_id uuid default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  missing_ids bigint[];
  sold_ids bigint[];
  reserved_ids bigint[];
begin
  perform private.lock_variants(array(select r.variant_id from private.parse_items(items) r));

  with checked as (
    select
      r.variant_id,
      r.quantity,
      v.id is not null as found,
      p.availability = 'in_stock' as tracks_stock,
      v.stock,
      private.held_quantity(r.variant_id, ignored_order_id) as held
    from private.parse_items(items) r
    left join public.variants v on v.id = r.variant_id
    left join public.products p on p.id = v.product_id
  )
  select
    coalesce(array_agg(c.variant_id order by c.variant_id) filter (where not c.found), '{}'),
    coalesce(array_agg(c.variant_id order by c.variant_id)
      filter (where c.found and c.tracks_stock and c.stock < c.quantity), '{}'),
    coalesce(array_agg(c.variant_id order by c.variant_id)
      filter (where c.found and c.tracks_stock and c.stock >= c.quantity
        and c.stock - c.held < c.quantity), '{}')
  into missing_ids, sold_ids, reserved_ids
  from checked c;

  if cardinality(missing_ids) > 0 then
    perform private.raise_error('VARIANT_NOT_FOUND', jsonb_build_object('variant_ids', missing_ids));
  end if;

  if cardinality(sold_ids) = 0 and cardinality(reserved_ids) = 0 then
    return null;
  end if;

  return jsonb_build_object('sold', sold_ids, 'reserved', reserved_ids);
end;
$$;

create function private.lock_and_check_variants(items jsonb, ignored_order_id uuid default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  problems jsonb := private.unavailable_items(items, ignored_order_id);
begin
  if problems is not null then
    perform private.raise_error('ITEMS_UNAVAILABLE', problems);
  end if;
end;
$$;

create function private.shift_order_stock(target_order_id uuid, units_sign integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform private.lock_variants(array(
    select oi.variant_id from public.order_items oi
    where oi.order_id = target_order_id and not oi.is_made_to_order
  ));

  update public.variants v
  set stock = v.stock + units_sign * oi.quantity
  from public.order_items oi
  where oi.order_id = target_order_id
    and not oi.is_made_to_order
    and v.id = oi.variant_id;
end;
$$;

create function private.is_sold_status(status public.order_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select status in ('confirmed', 'in_production', 'ready_for_pickup', 'shipped', 'delivered');
$$;

create view public.catalog_variants with (security_invoker = true) as
select
  v.id,
  v.product_id,
  v.size_id,
  v.neck_cm,
  v.chest_cm,
  v.back_length_cm,
  v.stock,
  greatest(v.stock - private.held_quantity(v.id), 0) as available_stock
from public.variants v;

revoke all on public.catalog_variants from anon, authenticated;
grant select on public.catalog_variants to anon, authenticated;
