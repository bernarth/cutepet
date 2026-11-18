begin;
select plan(6);

select tests.create_user('admin@test.bo') as admin_id \gset
select tests.authenticate_as(:'admin_id', as_admin => true);

select lives_ok(
  $$update public.settings set reservation_minutes = 60, size_tolerance_cm = 0,
    store_whatsapp = '71234567', qr_expires_on = current_date + 30$$,
  'admin saves the settings at the edge of each limit');
select throws_ok(
  'update public.settings set reservation_minutes = 61',
  '23514', null, 'a reservation cannot last more than 60 minutes');
select throws_ok(
  'update public.settings set reservation_minutes = 4',
  '23514', null, 'a reservation lasts at least 5 minutes');
select throws_ok(
  'update public.settings set size_tolerance_cm = 10.5',
  '23514', null, 'the size tolerance is at most 10 cm');
select throws_ok(
  'update public.settings set size_tolerance_cm = -1',
  '23514', null, 'the size tolerance cannot be negative');
select is(
  (select count(*)::integer from public.audit_log a
   where a.table_name = 'settings' and a.actor_id = :'admin_id'),
  1, 'the settings change is audited with the admin as the actor');

select * from finish();
rollback;
