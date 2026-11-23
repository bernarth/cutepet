begin;
select plan(20);

select tests.create_user('admin@test.bo') as admin_id \gset
select tests.create_user('customer@test.bo') as customer_id \gset
select tests.create_guest() as guest_id \gset

-- Admins add, read and edit channels

select tests.authenticate_as(:'admin_id', as_admin => true);
select lives_ok(
  $$insert into public.notification_channels (name, type, destination, events)
    values ('Celular de la dueña', 'telegram', '123456789', '{proof_uploaded,qr_expiry}')$$,
  'an admin adds a Telegram channel');
select lives_ok(
  $$insert into public.notification_channels (name, type, destination, events)
    values ('Grupo de ayudantes', 'telegram', '-1001234567890', '{proof_uploaded}')$$,
  'a Telegram group chat ID is negative');
select is((select count(*)::integer from public.notification_channels), 2, 'an admin reads the channels');
select lives_ok(
  $$update public.notification_channels set is_active = false, name = 'Dueña' where destination = '123456789'$$,
  'an admin deactivates and renames a channel');
select throws_ok(
  $$update public.notification_channels set type = 'email' where destination = '123456789'$$,
  '42501', null, 'the channel type cannot change');
select throws_ok(
  $$delete from public.notification_channels where destination = '123456789'$$,
  '42501', null, 'channels are never deleted');

-- Validation

select throws_ok(
  $$insert into public.notification_channels (name, type, destination, events)
    values ('Dueña', 'telegram', '@cutepet', '{proof_uploaded}')$$,
  '23514', null, 'a Telegram destination is a numeric chat ID');
select throws_ok(
  $$insert into public.notification_channels (name, type, destination, events)
    values ('Dueña', 'email', 'not-an-email', '{proof_uploaded}')$$,
  '23514', null, 'an email destination is an address');
select throws_ok(
  $$insert into public.notification_channels (name, type, destination, events)
    values ('Dueña', 'telegram', '555', '{}')$$,
  '23514', null, 'a channel subscribes to at least one event');
select throws_ok(
  $$insert into public.notification_channels (name, type, destination, events)
    values ('Dueña', 'telegram', '555', '{channel_test}')$$,
  '23514', null, 'nobody subscribes to the test event');
select throws_ok(
  $$insert into public.notification_channels (name, type, destination, events)
    values (' A ', 'telegram', '555', '{proof_uploaded}')$$,
  '23514', null, 'the name has at least 2 characters');
select throws_ok(
  $$insert into public.notification_channels (name, type, destination, events)
    values (repeat('a', 41), 'telegram', '555', '{proof_uploaded}')$$,
  '23514', null, 'the name has at most 40 characters');
select throws_ok(
  $$insert into public.notification_channels (name, type, destination, events)
    values ('Otra vez', 'telegram', '123456789', '{proof_uploaded}')$$,
  '23505', null, 'the same destination cannot be added twice');
select tests.clear_authentication();

select is(
  (select count(*)::integer from public.audit_log a
   where a.table_name = 'notification_channels' and a.actor_id = :'admin_id'),
  3, 'channel changes are audited with the admin as the actor');

-- Nobody else reaches channels

select tests.authenticate_as(:'customer_id');
select is((select count(*)::integer from public.notification_channels), 0, 'a customer cannot read channels');
select throws_ok(
  $$insert into public.notification_channels (name, type, destination, events)
    values ('Intruso', 'telegram', '999', '{proof_uploaded}')$$,
  '42501', null, 'a customer cannot add channels');
select tests.clear_authentication();

select tests.authenticate_as_guest(:'guest_id');
select is((select count(*)::integer from public.notification_channels), 0, 'a guest cannot read channels');
update public.notification_channels set name = 'Intruso';
select tests.clear_authentication();
select is((select count(*)::integer from public.notification_channels where name = 'Intruso'), 0,
  'a guest cannot edit channels');

select tests.authenticate_as_anon();
select throws_ok('select * from public.notification_channels', '42501', null, 'visitors cannot read channels');
select throws_ok('select * from public.notification_channels_overview', '42501', null,
  'visitors cannot read the channel overview');
select tests.clear_authentication();

select * from finish();
rollback;
