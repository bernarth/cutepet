begin;
select plan(53);

delete from vault.secrets where name in ('notify_url', 'site_url');
select vault.create_secret('https://cutepet.test/', 'site_url');

insert into public.notification_channels (name, type, destination, events, is_active) values
  ('Dueña', 'telegram', '111', '{proof_uploaded,qr_expiry}', true),
  ('Solo QR', 'telegram', '222', '{qr_expiry}', true),
  ('Ayudante <inactiva>', 'telegram', '333', '{proof_uploaded}', false),
  ('Correo', 'email', 'owner@test.bo', '{proof_uploaded,qr_expiry}', true);

select id as owner_channel from public.notification_channels where destination = '111' \gset
select id as qr_channel from public.notification_channels where destination = '222' \gset
select id as inactive_channel from public.notification_channels where destination = '333' \gset
select id as email_channel from public.notification_channels where destination = 'owner@test.bo' \gset

select tests.set_settings('{"qr_checkout_enabled": true, "qr_image_path": "qr/test.png", "qr_expires_on": null}');
select tests.create_user('admin@test.bo') as admin_id \gset
select tests.create_user('ana@test.bo') as ana \gset
select tests.create_user('bea@test.bo') as bea \gset
select tests.create_user('caro@test.bo') as caro \gset
select tests.create_user('dina@test.bo') as dina \gset
select tests.create_user('eva@test.bo') as eva \gset

-- Helpers

select is(private.format_bs(310), 'Bs 310', 'whole amounts have no decimals');
select is(private.format_bs(120.5), 'Bs 120,50', 'cents use a decimal comma');
select is(private.format_bs(1500), 'Bs 1.500', 'thousands are grouped with a dot');
select is(private.html_escape('<b>&"'), '&lt;b&gt;&amp;&quot;', 'HTML is escaped');
select is(private.store_time_label('2026-11-22 18:35:00+00'), '22/11/2026 14:35', 'times are shown in La Paz');
select is(private.admin_link('/admin/pedidos/CP1'), 'https://cutepet.test/admin/pedidos/CP1',
  'links start at site_url without a double slash');

-- An on time proof alerts only the active Telegram channels subscribed to it

select tests.create_variant(price => 310) as on_time_variant \gset
select tests.reserve(:'ana', tests.items(:on_time_variant)) as on_time_order \gset
select tests.upload_proof(:'on_time_order') as on_time_proof \gset
select tests.authenticate_as(:'ana');
select public.submit_payment_proof(:'on_time_order', :'on_time_proof');
select tests.clear_authentication();

select is(
  (select array_agg(n.channel_id) from public.notifications n where n.event = 'proof_uploaded'),
  array[:owner_channel]::bigint[],
  'inactive, unsubscribed and email channels get nothing');
select is(
  (select n.message from public.notifications n where n.event = 'proof_uploaded'),
  concat_ws(E'\n',
    '🧾 <b>Comprobante subido · ' || (tests.order_row(:'on_time_order')).code || '</b>',
    'Bs 310 · Ana Pérez · <a href="https://wa.me/59171234567">71234567</a>',
    'Recojo en La Paz',
    'Subido el ' || private.store_time_label(now()),
    'https://cutepet.test/admin/pedidos/' || (tests.order_row(:'on_time_order')).code),
  'the proof alert has the code, total, name, WhatsApp link, delivery, time and order link');
select is(
  (select n.status::text || n.attempts || n.is_silent::text from public.notifications n where n.event = 'proof_uploaded'),
  'pending0false', 'the alert waits for notify and is never silent');

-- Customer values are escaped and bus parcel orders show the city

delete from public.notifications;
select tests.create_variant() as parcel_variant \gset
select tests.authenticate_as(:'bea');
select o.id as parcel_order from public.reserve_order(
  tests.items(:parcel_variant), 'Bea <b>&"', '61234567', 'bus_parcel', 'Oruro <i>', 'Bea'
) o \gset
select tests.clear_authentication();
select tests.upload_proof(:'parcel_order') as parcel_proof \gset
select tests.authenticate_as(:'bea');
select public.submit_payment_proof(:'parcel_order', :'parcel_proof');
select tests.clear_authentication();

select matches(
  (select n.message from public.notifications n),
  'Bea &lt;b&gt;&amp;&quot; · <a href="https://wa.me/59161234567">61234567</a>',
  'the customer name is escaped');
select matches((select n.message from public.notifications n), E'\nEnvío por flota a Oruro &lt;i&gt;\n',
  'bus parcel orders show the escaped city');

-- Late proofs

delete from public.notifications;
select tests.create_variant() as late_free_variant \gset
select tests.reserve(:'caro', tests.items(:late_free_variant)) as late_free_order \gset
select tests.expire_reservation(:'late_free_order');
select tests.upload_proof(:'late_free_order') as late_free_proof \gset
select tests.authenticate_as(:'caro');
select public.submit_payment_proof(:'late_free_order', :'late_free_proof');
select tests.clear_authentication();

select matches((select n.message from public.notifications n),
  E'^🧾 <b>Comprobante subido · CP[0-9]+</b>\nLlegó después de que venció la reserva; las prendas seguían libres.\n',
  'a late proof with free pieces is a normal alert with the late line');

delete from public.notifications;
select tests.create_variant() as late_gone_variant \gset
select tests.reserve(:'dina', tests.items(:late_gone_variant)) as late_gone_order \gset
select tests.expire_reservation(:'late_gone_order');
select tests.reserve(:'eva', tests.items(:late_gone_variant)) as taker_order \gset
select tests.upload_proof(:'late_gone_order') as late_gone_proof \gset
select tests.authenticate_as(:'dina');
select public.submit_payment_proof(:'late_gone_order', :'late_gone_proof');
select tests.clear_authentication();

select matches((select n.message from public.notifications n),
  E'^⚠️ <b>Comprobante tardío con prenda vendida · CP[0-9]+</b>\nLa reserva venció y una prenda ya no está libre. Resuélvelo por WhatsApp antes de confirmar.\n',
  'a late proof whose piece was taken says it clearly');
select doesnt_match((select n.message from public.notifications n), 'las prendas seguían libres',
  'and does not say the pieces were free');

-- Restore and revert reach proof_uploaded without alerting

delete from public.notifications;
select tests.authenticate_as(:'admin_id', as_admin => true);
select public.cancel_order(:'on_time_order', 'No llegó el pago');
select is((public.restore_order(:'on_time_order', 'Sí llegó')).status, 'proof_uploaded',
  'a restored order is back in proof_uploaded');
select public.confirm_order(:'on_time_order');
select is((public.revert_order_status(:'on_time_order', 'Confirmé por error')).status, 'proof_uploaded',
  'a reverted order is back in proof_uploaded');
select tests.clear_authentication();
select is((select count(*)::integer from public.notifications), 0, 'restore and revert do not alert');

-- A notification failure never blocks the caller

select is(private.enqueue_notification('proof_uploaded', null), 0, 'a message that cannot be queued is skipped');
select is((select count(*)::integer from public.notifications), 0, 'and leaves nothing behind');

-- QR expiry alerts

select tests.set_settings(jsonb_build_object('qr_expires_on', private.store_today() + 7));
select private.close_expired_qr();
select is(
  (select array_agg(n.channel_id order by n.channel_id) from public.notifications n where n.event = 'qr_expiry'),
  array[:owner_channel, :qr_channel]::bigint[],
  'the QR warning goes to every active Telegram channel subscribed to it');
select is(
  (select n.message from public.notifications n where n.channel_id = :owner_channel),
  concat_ws(E'\n',
    '⏰ <b>El QR de cobro vence en 7 días</b>',
    'Vence el ' || private.store_date_label(private.store_today() + 7) || '. Sube un QR nuevo antes de esa fecha.',
    'https://cutepet.test/admin/configuracion'),
  'the warning says when the QR expires and links to the settings');
select is((select bool_and(n.is_silent) from public.notifications n), true, 'QR alerts are silent');

delete from public.notifications;
select tests.set_settings(jsonb_build_object('qr_expires_on', private.store_today() + 3));
select private.close_expired_qr();
select matches((select n.message from public.notifications n where n.channel_id = :owner_channel),
  'vence en 3 días', 'it warns 3 days before');

delete from public.notifications;
select tests.set_settings(jsonb_build_object('qr_expires_on', private.store_today() + 1));
select private.close_expired_qr();
select matches((select n.message from public.notifications n where n.channel_id = :owner_channel),
  'vence mañana', 'it warns the day before');

delete from public.notifications;
select tests.set_settings(jsonb_build_object('qr_expires_on', private.store_today() + 6));
select private.close_expired_qr();
select tests.set_settings(jsonb_build_object('qr_expires_on', private.store_today() + 2));
select private.close_expired_qr();
select tests.set_settings(jsonb_build_object('qr_expires_on', private.store_today()));
select private.close_expired_qr();
select is((select count(*)::integer from public.notifications), 0, 'other days do not warn');

select tests.set_settings(jsonb_build_object('qr_expires_on', private.store_today() - 1));
select is(private.close_expired_qr(), true, 'the daily job turns off the expired QR');
select is(
  (select n.message from public.notifications n where n.channel_id = :owner_channel),
  concat_ws(E'\n',
    '⛔ <b>El QR venció y se desactivó el pago con QR</b>',
    'Venció el ' || private.store_date_label(private.store_today() - 1) || '. Sube un QR nuevo y vuelve a activarlo.',
    'https://cutepet.test/admin/configuracion'),
  'and says so');

delete from public.notifications;
select private.close_expired_qr();
select tests.set_settings(jsonb_build_object('qr_expires_on', private.store_today() + 7));
select private.close_expired_qr();
select is((select count(*)::integer from public.notifications), 0, 'a QR that is already off does not alert');

-- notify claims rows and records the result

delete from public.notifications;
insert into public.notifications (event, channel_id, message) values
  ('proof_uploaded', :owner_channel, 'uno'),
  ('proof_uploaded', :qr_channel, 'dos');

set local role service_role;
select is(
  (select array_agg(c.destination || ':' || c.message order by c.id) from public.claim_notifications() c),
  array['111:uno', '222:dos'], 'notify claims pending rows with their destination');
select is((select count(*)::integer from public.claim_notifications()), 0, 'a claimed row is not claimed twice');
reset role;

select id as first_row from public.notifications where message = 'uno' \gset
select id as second_row from public.notifications where message = 'dos' \gset

set local role service_role;
select public.finish_notification(:first_row, 'chat not found');
select public.finish_notification(:second_row);
reset role;
select is((select n.status::text || n.attempts from public.notifications n where n.id = :first_row), 'failed1',
  'a failed delivery is recorded');
select is((select n.last_error from public.notifications n where n.id = :first_row), 'chat not found',
  'with its error');
select is((select n.status = 'sent' and n.sent_at is not null from public.notifications n where n.id = :second_row), true,
  'a delivered row is sent');
select is(private.retry_notifications(), true, 'the retry job calls notify while a row can be retried');

set local role service_role;
select is((select array_agg(c.id) from public.claim_notifications() c), array[:first_row]::bigint[],
  'a failed row is claimed again');
select public.finish_notification(:first_row, 'chat not found');
select is((select count(*)::integer from public.claim_notifications()), 1, 'a third attempt is allowed');
select public.finish_notification(:first_row);
reset role;
select is((select n.status::text || n.attempts || coalesce(n.last_error, '') from public.notifications n where n.id = :first_row),
  'sent3chat not found', 'a later success keeps the earlier error as a record');

update public.notifications set status = 'failed', attempts = 3 where id = :first_row;
set local role service_role;
select is((select count(*)::integer from public.claim_notifications()), 0, 'no row is sent more than 3 times');
reset role;
select is(private.retry_notifications(), false, 'the retry job does nothing when no row can be retried');

update public.notifications set status = 'sending', attempts = 1, locked_at = now() - interval '6 minutes'
where id = :second_row;
set local role service_role;
select is((select array_agg(c.id) from public.claim_notifications() c), array[:second_row]::bigint[],
  'a row stuck in sending is claimed again after 5 minutes');
reset role;

update public.notifications set status = 'sending', attempts = 3, locked_at = now() - interval '6 minutes'
where id = :second_row;
set local role service_role;
select is((select count(*)::integer from public.claim_notifications()), 0, 'a stuck row with no attempts left is not sent');
reset role;
select is((select n.status::text || n.last_error from public.notifications n where n.id = :second_row),
  'failednotify no respondió', 'it is marked failed');

select is(
  (select j.schedule from cron.job j where j.jobname = 'retry-notifications'),
  '*/5 * * * *', 'the retry job runs every 5 minutes');

-- Test notifications

select tests.authenticate_as(:'admin_id', as_admin => true);
select public.send_test_notification(:inactive_channel) as test_row \gset
select is(
  (select n.event::text || ':' || n.channel_id from public.notifications n where n.id = :test_row),
  'channel_test:' || :inactive_channel, 'an admin sends a test to an inactive channel');
select matches((select n.message from public.notifications n where n.id = :test_row), 'Ayudante &lt;inactiva&gt;',
  'the test names the channel, escaped');
select throws_ok(format('select public.send_test_notification(%s)', :email_channel), 'P0001', 'CHANNEL_NOT_FOUND',
  'email channels cannot be tested yet');

select is(
  (select o.last_error from public.notification_channels_overview o where o.id = :qr_channel),
  'notify no respondió', 'the overview shows the error of a channel whose latest delivery failed');
select is(
  (select o.last_error from public.notification_channels_overview o where o.id = :inactive_channel),
  null, 'and nothing while the latest delivery has not failed');
select throws_ok(
  format($$insert into public.notifications (event, channel_id, message) values ('channel_test', %s, 'x')$$, :owner_channel),
  '42501', null, 'admins cannot write to the outbox');
select throws_ok('select * from public.claim_notifications()', '42501', null, 'admins cannot claim rows');
select throws_ok(format('select public.finish_notification(%s)', :first_row), '42501', null,
  'admins cannot finish rows');
select tests.clear_authentication();

select tests.authenticate_as(:'ana');
select is((select count(*)::integer from public.notifications), 0, 'customers cannot read the outbox');
select throws_ok(format('select public.send_test_notification(%s)', :owner_channel), 'P0001', 'FORBIDDEN',
  'customers cannot send tests');
select tests.clear_authentication();

select * from finish();
rollback;
