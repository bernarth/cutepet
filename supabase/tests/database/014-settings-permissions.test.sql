begin;
select plan(7);

select tests.set_settings('{"qr_checkout_enabled": true, "qr_image_path": "qr/test.png", "qr_expires_on": null}');
select tests.create_user('customer@test.bo') as customer_id \gset
select tests.create_user('guest@test.bo') as guest_id \gset
update auth.users set is_anonymous = true where id = :'guest_id';
select count(*) as settings_audits from public.audit_log where table_name = 'settings' \gset

-- Signed in customer: the column grant lets the statement run, RLS lets it match no row
select tests.authenticate_as(:'customer_id');
update public.settings set qr_checkout_enabled = false, reservation_minutes = 60;
select tests.clear_authentication();
select is((select qr_checkout_enabled from public.settings), true,
  'a signed in customer cannot turn QR checkout off');

-- Anonymous guest created at checkout: same authenticated role, also not an admin
select set_config('request.jwt.claims', json_build_object(
  'sub', :'guest_id', 'role', 'authenticated', 'is_anonymous', true, 'app_metadata', '{}'::json)::text, true);
set local role authenticated;
update public.settings set qr_checkout_enabled = false;
select tests.clear_authentication();
select is((select qr_checkout_enabled from public.settings), true,
  'an anonymous guest cannot change settings');

select tests.authenticate_as_anon();
select throws_ok('update public.settings set qr_checkout_enabled = false', '42501', null,
  'a visitor without a session cannot even try');
select tests.clear_authentication();

select is(
  (select count(*)::integer from public.audit_log where table_name = 'settings'), :settings_audits,
  'none of those attempts changed anything, so nothing was audited');

-- The postgres role owns the table and skips RLS. If it runs with the claims of a customer still
-- set, the change goes through and the trigger records that customer as the actor.
-- This is what the local test script did, never something a customer can do.
select set_config('request.jwt.claims', json_build_object('sub', :'customer_id', 'role', 'authenticated')::text, true);
update public.settings set qr_checkout_enabled = false;
select is((select qr_checkout_enabled from public.settings), false,
  'postgres bypasses RLS even with customer claims set');
select is(
  (select actor_id from public.audit_log where table_name = 'settings' order by id desc limit 1),
  :'customer_id'::uuid, 'and the audit trigger reads the actor from those claims');
select ok(
  (select rolbypassrls or rolsuper from pg_roles where rolname = current_user),
  'because the role running it is a superuser that bypasses RLS');

select * from finish();
rollback;
