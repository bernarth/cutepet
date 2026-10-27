#!/usr/bin/env bash
# Proves that reserve_order never sells a unique item twice under real concurrency.
# pgTAP runs in one session, so this script opens several database sessions at the same time.
# Scenario 1: session A reserves and keeps its transaction open. Session B must wait for the lock and then fail.
# Scenario 2: many customers race for the same unique item. Exactly one must win.

set -euo pipefail

racers=10
container=$(docker ps --filter 'name=^supabase_db_' --format '{{.Names}}' | head -n 1)

if [ -z "$container" ]; then
  echo "Local Supabase is not running. Start it with: supabase start"
  exit 1
fi

run_sql() {
  docker exec -i "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt "$@"
}

run_id=$(date +%s)
work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT

previous_qr_setting=$(run_sql -c "select qr_checkout_enabled from public.settings")
without_audit() {
  run_sql <<SQL
begin;
set local session_replication_role = replica;
$1
commit;
SQL
}

without_audit "update public.settings set qr_checkout_enabled = true;" > /dev/null

create_variant() {
  without_audit "
with category as (
  insert into public.categories (name, slug) values ('Concurrencia', 'concurrencia-$run_id-$1') returning id
), product as (
  insert into public.products (name, slug, pet_type_id, category_id, price)
  select 'Prenda única $1', 'prenda-unica-$run_id-$1', (select id from public.pet_types where slug = 'perro'), category.id, 100
  from category returning id
)
insert into public.variants (product_id, size_id, stock)
select product.id, (select id from public.sizes where label = '1'), 1 from product
returning id;"
}

create_user() {
  run_sql -c "insert into auth.users (id, instance_id, aud, role, email)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'race-$run_id-$1@test.bo') returning id"
}

reserve_as() {
  local user_id=$1 variant_id=$2 hold_seconds=$3
  run_sql <<SQL 2>&1
begin;
select set_config('request.jwt.claims', '{"sub":"$user_id","role":"authenticated"}', true);
set local role authenticated;
select 'reserved ' || (public.reserve_order('[{"variant_id": $variant_id, "quantity": 1}]', 'Cliente', '71234567', 'pickup_point')).code;
select pg_sleep($hold_seconds);
commit;
SQL
}

count_active_orders() {
  run_sql -c "select count(*) from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.variant_id = $1 and o.status = 'pending_payment'"
}

cleanup() {
  run_sql > /dev/null <<SQL
begin;
set local session_replication_role = replica;
create temp table run_variants on commit drop as
  select v.id, v.product_id from public.variants v
  join public.products p on p.id = v.product_id where p.slug like 'prenda-unica-$run_id-%';
create temp table run_orders on commit drop as
  select distinct oi.order_id as id from public.order_items oi where oi.variant_id in (select id from run_variants);
delete from public.audit_log
where (table_name = 'orders' and record_id in (select id::text from run_orders))
  or (table_name = 'order_items' and (new_data ->> 'order_id') in (select id::text from run_orders));
delete from public.order_items where order_id in (select id from run_orders);
delete from public.orders where id in (select id from run_orders);
delete from public.variants where id in (select id from run_variants);
delete from public.products where id in (select product_id from run_variants);
delete from public.categories where slug like 'concurrencia-$run_id-%';
delete from auth.users where email like 'race-$run_id-%';
update public.settings set qr_checkout_enabled = '$previous_qr_setting';
commit;
SQL
}

failures=0

check() {
  local description=$1 passed=$2
  if [ "$passed" = "true" ]; then
    echo "  ok      $description"
  else
    echo "  FAILED  $description"
    failures=$((failures + 1))
  fi
}

echo "Scenario 1: session B waits for session A's lock and then fails"
variant_one=$(create_variant one)
user_a=$(create_user a)
user_b=$(create_user b)

reserve_as "$user_a" "$variant_one" 3 > "$work_dir/session-a.log" &
session_a=$!
sleep 1
started_at=$(date +%s)
reserve_as "$user_b" "$variant_one" 0 > "$work_dir/session-b.log" || true
waited=$(( $(date +%s) - started_at ))
wait "$session_a"

echo "  session A: $(grep -m 1 -E 'reserved|ERROR' "$work_dir/session-a.log")"
echo "  session B: $(grep -m 1 -E 'reserved|ERROR' "$work_dir/session-b.log") (waited ${waited}s)"
check "session A reserved the item" "$(grep -q '^reserved' "$work_dir/session-a.log" && echo true || echo false)"
check "session B was rejected with ITEMS_UNAVAILABLE" "$(grep -q 'ITEMS_UNAVAILABLE' "$work_dir/session-b.log" && echo true || echo false)"
check "session B waited for the row lock" "$([ "$waited" -ge 1 ] && echo true || echo false)"
check "exactly one active order holds the item" "$([ "$(count_active_orders "$variant_one")" = "1" ] && echo true || echo false)"

echo
echo "Scenario 2: $racers customers race for the same unique item"
variant_two=$(create_variant two)
racer_ids=()
for racer in $(seq 1 "$racers"); do
  racer_ids+=("$(create_user "racer-$racer")")
done
racer_pids=()
for racer in $(seq 1 "$racers"); do
  reserve_as "${racer_ids[$((racer - 1))]}" "$variant_two" 0 > "$work_dir/racer-$racer.log" &
  racer_pids+=("$!")
done
for racer_pid in "${racer_pids[@]}"; do
  wait "$racer_pid" || true
done

count_logs_matching() {
  { grep -l "$1" "$work_dir"/racer-*.log || true; } | wc -l | tr -d ' '
}

winners=$(count_logs_matching '^reserved')
rejected=$(count_logs_matching 'ERROR:  ITEMS_UNAVAILABLE')
echo "  winners: $winners, rejected with ITEMS_UNAVAILABLE: $rejected"
check "exactly one customer won" "$([ "$winners" = "1" ] && echo true || echo false)"
check "every other customer was rejected" "$([ "$rejected" = "$((racers - 1))" ] && echo true || echo false)"
check "exactly one active order holds the item" "$([ "$(count_active_orders "$variant_two")" = "1" ] && echo true || echo false)"

cleanup

echo
if [ "$failures" -gt 0 ]; then
  echo "FAIL: $failures check(s) failed"
  exit 1
fi
echo "PASS: no item was sold twice"
