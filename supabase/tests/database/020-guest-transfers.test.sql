begin;
select plan(49);

select tests.set_settings('{"qr_checkout_enabled": true, "qr_image_path": "qr/test.png", "qr_expires_on": null, "reservation_minutes": 15}');
select tests.create_guest() as guest \gset
select tests.create_guest() as other_guest \gset
select tests.create_guest() as late_guest \gset
select tests.create_guest() as linked_guest \gset
select tests.create_guest() as conflict_guest \gset
select tests.create_guest() as replaced_guest \gset
select tests.create_user('ana@test.bo') as ana \gset
select tests.create_user('bea@test.bo') as bea \gset
select tests.create_user('caro@test.bo') as caro \gset
select tests.create_variant() as proof_variant \gset
select tests.create_variant() as pending_variant \gset
select tests.create_variant() as other_variant \gset
select tests.create_variant() as late_variant \gset
select tests.create_variant() as linked_variant \gset
select tests.create_variant() as conflict_variant \gset
select tests.create_variant() as account_variant \gset
select tests.create_variant() as replaced_variant \gset

create function pg_temp.start_transfer(guest_id uuid)
returns text
language plpgsql
as $$
declare
  result text;
begin
  perform tests.authenticate_as_guest(guest_id);
  result := public.start_guest_transfer();
  perform tests.clear_authentication();
  return result;
end;
$$;

-- Access

select ok(not has_table_privilege('anon', 'private.guest_transfers', 'select,insert,update,delete'),
  'anon has no access to the transfers');
select ok(not has_table_privilege('authenticated', 'private.guest_transfers', 'select,insert,update,delete'),
  'customers have no access to the transfers');
select ok(not has_table_privilege('service_role', 'private.guest_transfers', 'select,insert,update,delete'),
  'service_role has no access to the transfers');
select is((select c.relrowsecurity from pg_class c where c.oid = 'private.guest_transfers'::regclass), true,
  'the transfers have RLS on');
select ok(not has_function_privilege('anon', 'public.start_guest_transfer()', 'execute'),
  'anon cannot start a transfer');
select ok(not has_function_privilege('anon', 'public.transfer_guest_orders(text)', 'execute'),
  'anon cannot use a transfer');
select ok(not has_function_privilege('authenticated', 'private.move_guest_orders(private.guest_transfers)', 'execute'),
  'customers cannot move orders directly');
select ok(not has_function_privilege('authenticated', 'private.is_guest(uuid)', 'execute'),
  'customers cannot ask who is a guest');

select tests.authenticate_as(:'ana');
select throws_ok('select public.start_guest_transfer()', 'P0001', 'FORBIDDEN',
  'an account cannot start a transfer');
select throws_ok($$select * from public.transfer_guest_orders('nope')$$, 'P0001', 'TRANSFER_INVALID',
  'an unknown token is refused');
select results_eq('select * from public.transfer_guest_orders()', $$values ('nothing', 0)$$,
  'without a token there is nothing to finish');
select tests.clear_authentication();

select tests.authenticate_as_guest(:'ana');
select throws_ok('select public.start_guest_transfer()', 'P0001', 'FORBIDDEN',
  'an old guest token of an account that is already permanent cannot start a transfer');
select tests.clear_authentication();

-- The guest orders, with their proof, move to the account

select tests.reserve(:'guest', tests.items(:proof_variant)) as proof_order \gset
select tests.upload_proof(:'proof_order') as proof_path \gset
select tests.authenticate_as_guest(:'guest');
select public.submit_payment_proof(:'proof_order', :'proof_path');
select tests.clear_authentication();
select tests.reserve(:'guest', tests.items(:pending_variant)) as pending_order \gset
select tests.reserve(:'other_guest', tests.items(:other_variant)) as other_order \gset

select pg_temp.start_transfer(:'guest') as token \gset
select is(char_length(:'token'), 64, 'the token is long and random');
select is(
  (select count(*) from private.guest_transfers t where to_jsonb(t)::text like '%' || :'token' || '%'), 0::bigint,
  'the token itself is never stored');
select is(
  (select t.token_hash from private.guest_transfers t where t.guest_id = :'guest'),
  sha256(convert_to(:'token', 'UTF8')), 'only its hash is stored');
select ok(
  (select t.expires_at between now() + interval '23 hours 59 minutes' and now() + interval '24 hours 1 minute'
   from private.guest_transfers t where t.guest_id = :'guest'),
  'the token is valid for 24 hours');

select tests.authenticate_as_guest(:'other_guest');
select throws_ok(format('select * from public.transfer_guest_orders(%L)', :'token'), 'P0001', 'FORBIDDEN',
  'a guest cannot receive orders');
select tests.clear_authentication();
select is((tests.order_row(:'proof_order')).customer_id, :'guest'::uuid, 'a refused transfer moves nothing');

select tests.authenticate_as(:'ana');
select results_eq(format('select * from public.transfer_guest_orders(%L)', :'token'), $$values ('moved', 2)$$,
  'the account receives every order of the guest');
select is((select count(*) from public.orders o where o.customer_id = :'ana'), 2::bigint, 'the account reads them');
select is(
  (select count(*) from storage.objects so where so.bucket_id = 'payment-proofs' and so.name = :'proof_path'),
  1::bigint, 'the account reads the proof');
select results_eq(format('select * from public.transfer_guest_orders(%L)', :'token'), $$values ('moved', 2)$$,
  'repeating it answers the same');
select results_eq('select * from public.transfer_guest_orders()', $$values ('nothing', 0)$$,
  'a finished transfer is not finished again');
select is(
  (public.cancel_order(:'pending_order')).cancel_reason, 'cancelled_by_customer',
  'the account manages the moved order like its own');
select tests.clear_authentication();

select is((tests.order_row(:'other_order')).customer_id, :'other_guest'::uuid, 'the orders of other guests stay');
select is((tests.order_row(:'proof_order')).status, 'proof_uploaded', 'the status does not change');
select results_eq(
  format($$select a.reason, a.actor_id, a.old_data ->> 'customer_id', a.new_data ->> 'customer_id'
    from public.audit_log a where a.record_id = %L order by a.id desc limit 1$$, :'proof_order'),
  format($$values ('guest_orders_transferred', %L::uuid, %L, %L)$$, :'ana', :'guest', :'ana'),
  'the move is audited with its reason and both owners');
select tests.authenticate_as_guest(:'guest');
select is((select count(*) from public.orders o), 0::bigint, 'the guest no longer reads them');
select tests.clear_authentication();

-- Used by another account

select tests.authenticate_as(:'bea');
select throws_ok(format('select * from public.transfer_guest_orders(%L)', :'token'), 'P0001', 'TRANSFER_INVALID',
  'a token used by one account is refused to another');
select is((select count(*) from public.orders o), 0::bigint, 'the other account receives nothing');
select tests.clear_authentication();

-- Expired

select tests.reserve(:'late_guest', tests.items(:late_variant)) as late_order \gset
select pg_temp.start_transfer(:'late_guest') as late_token \gset
update private.guest_transfers t set expires_at = now() where t.guest_id = :'late_guest';
select tests.authenticate_as(:'ana');
select throws_ok(format('select * from public.transfer_guest_orders(%L)', :'late_token'), 'P0001', 'TRANSFER_INVALID',
  'an expired token is refused');
select tests.clear_authentication();
select is((tests.order_row(:'late_order')).customer_id, :'late_guest'::uuid, 'an expired token moves nothing');

-- Replaced by a newer token

select tests.reserve(:'replaced_guest', tests.items(:replaced_variant)) as replaced_order \gset
select pg_temp.start_transfer(:'replaced_guest') as old_token \gset
select pg_temp.start_transfer(:'replaced_guest') as new_token \gset
select tests.authenticate_as(:'bea');
select throws_ok(format('select * from public.transfer_guest_orders(%L)', :'old_token'), 'P0001', 'TRANSFER_INVALID',
  'a replaced token is refused');
select results_eq(format('select * from public.transfer_guest_orders(%L)', :'new_token'), $$values ('moved', 1)$$,
  'the newest token works');
select tests.clear_authentication();

-- The guest linked a Google account meanwhile

select tests.reserve(:'linked_guest', tests.items(:linked_variant)) as linked_order \gset
select pg_temp.start_transfer(:'linked_guest') as linked_token \gset
update auth.users u set is_anonymous = false where u.id = :'linked_guest';
select tests.authenticate_as(:'bea');
select throws_ok(format('select * from public.transfer_guest_orders(%L)', :'linked_token'), 'P0001', 'TRANSFER_INVALID',
  'the orders of a guest who linked their own account never move');
select tests.clear_authentication();
select is((tests.order_row(:'linked_order')).customer_id, :'linked_guest'::uuid, 'they stay with that account');

-- Both sides have a pending payment

select tests.reserve(:'conflict_guest', tests.items(:conflict_variant)) as conflict_order \gset
select tests.reserve(:'caro', tests.items(:account_variant)) as account_order \gset
select pg_temp.start_transfer(:'conflict_guest') as conflict_token \gset
select tests.authenticate_as(:'caro');
select results_eq(format('select * from public.transfer_guest_orders(%L)', :'conflict_token'), $$values ('pending_conflict', 0)$$,
  'two pending payments are reported');
select tests.clear_authentication();
select is((tests.order_row(:'conflict_order')).customer_id, :'conflict_guest'::uuid, 'nothing moves');
select is((tests.order_row(:'conflict_order')).status, 'pending_payment', 'the guest order is not cancelled');
select is((tests.order_row(:'account_order')).status, 'pending_payment', 'the account order is not cancelled');
select is(
  (select count(*) from public.audit_log a where a.record_id = :'conflict_order' and a.reason = 'guest_orders_transferred'),
  0::bigint, 'a refused move leaves no audit row');

select tests.authenticate_as(:'bea');
select throws_ok(format('select * from public.transfer_guest_orders(%L)', :'conflict_token'), 'P0001', 'TRANSFER_INVALID',
  'the transfer is tied to the first account');
select tests.clear_authentication();

update private.guest_transfers t set expires_at = now() - interval '1 day' where t.guest_id = :'conflict_guest';
select tests.authenticate_as(:'caro');
select results_eq('select * from public.transfer_guest_orders()', $$values ('pending_conflict', 0)$$,
  'it stays pending while both payments are open');
select public.cancel_order(:'account_order');
select results_eq('select * from public.transfer_guest_orders()', $$values ('moved', 1)$$,
  'it is finished without the token, even after 24 hours');
select is((select o.customer_id from public.orders o where o.id = :'conflict_order'), :'caro'::uuid,
  'the order is in the account');
select tests.clear_authentication();

-- An expired reservation is not a conflict

select tests.create_guest() as expired_guest \gset
select tests.create_variant() as expired_variant \gset
select tests.reserve(:'expired_guest', tests.items(:expired_variant)) as expired_order \gset
select pg_temp.start_transfer(:'expired_guest') as expired_token \gset
select tests.expire_reservation(:'expired_order');
select tests.authenticate_as(:'caro');
select results_eq(format('select * from public.transfer_guest_orders(%L)', :'expired_token'), $$values ('moved', 1)$$,
  'an expired reservation moves');
select is((select o.cancel_reason from public.orders o where o.id = :'expired_order'), 'reservation_expired',
  'it still accepts a late proof');
select tests.clear_authentication();

-- Deleting users

delete from auth.users u where u.id = :'caro';
select is((select count(*) from private.guest_transfers t where t.guest_id in (:'conflict_guest', :'expired_guest')), 0::bigint,
  'the transfers of a deleted account go with it');
select is((tests.order_row(:'expired_order')).customer_id, null, 'its orders are kept without an owner');

select * from finish();
rollback;
