begin;
select plan(27);

select tests.set_settings('{"qr_checkout_enabled": true, "qr_image_path": "qr/test.png", "qr_expires_on": null, "reservation_minutes": 15}');
select tests.create_variant() as guest_variant \gset
select tests.create_variant() as other_variant \gset
select tests.create_variant() as late_variant \gset
select tests.create_variant() as newer_variant \gset
select tests.create_variant() as qr_variant \gset
select tests.create_guest() as guest \gset
select tests.create_guest() as other_guest \gset
select tests.create_user('late@test.bo') as late_customer \gset
select tests.create_user('admin@test.bo') as admin_id \gset

-- Guests (anonymous users) can do the whole QR checkout on their own orders

select tests.authenticate_as_guest(:'guest');
select (public.reserve_order(tests.items(:guest_variant), 'Ana Pérez', '71234567', 'pickup_point')).id
  as guest_order \gset
select is(
  (select o.status from public.orders o where o.id = :'guest_order'), 'pending_payment',
  'a guest can reserve an order and read it');
select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', %L)$$, :'guest_order' || '/proof.jpg'),
  'a guest can upload a proof into the order folder');
select tests.clear_authentication();

select tests.reserve(:'other_guest', tests.items(:other_variant)) as other_order \gset
select tests.upload_proof(:'other_order') as other_proof \gset

select tests.authenticate_as_guest(:'guest');
select is((select count(*) from public.orders o where o.id = :'other_order'), 0::bigint,
  'a guest cannot read the orders of another guest');
select is(
  (select count(*) from storage.objects so where so.bucket_id = 'payment-proofs' and so.name = :'other_proof'),
  0::bigint, 'a guest cannot read the proofs of another guest');
update public.settings set qr_checkout_enabled = false;
select is((select qr_checkout_enabled from public.settings), true, 'a guest cannot change settings');
select throws_ok(format('select public.confirm_order(%L)', :'guest_order'), 'P0001', 'FORBIDDEN',
  'a guest cannot confirm orders');
select throws_ok(format('select public.adjust_stock(%s, 5, %L)', :guest_variant, 'prueba'), 'P0001', 'FORBIDDEN',
  'a guest cannot adjust stock');
select is(
  (public.submit_payment_proof(:'guest_order', :'guest_order' || '/proof.jpg')).status, 'proof_uploaded',
  'a guest can submit the proof of their own order');
select tests.clear_authentication();

select tests.reserve(:'other_guest', tests.items(:newer_variant)) as replaced_check \gset
select tests.authenticate_as_guest(:'other_guest');
select is((public.cancel_order(:'replaced_check')).cancel_reason, 'cancelled_by_customer',
  'a guest can cancel their own pending order');
select tests.clear_authentication();

-- my_checkout_order

select tests.authenticate_as_anon();
select throws_ok('select * from public.my_checkout_order()', '42501', null,
  'visitors without a session cannot call my_checkout_order');
select tests.clear_authentication();

select tests.reserve(:'late_customer', tests.items(:late_variant)) as late_order \gset
select tests.authenticate_as(:'late_customer');
select is((select m.id from public.my_checkout_order() m), :'late_order'::uuid,
  'without a code it returns the pending order');
select ok((select m.seconds_left between 899 and 900 from public.my_checkout_order() m),
  'the seconds left come from the server clock');
select tests.clear_authentication();

select tests.authenticate_as_guest(:'guest');
select is((select count(*) from public.my_checkout_order((tests.order_row(:'late_order')).code)), 0::bigint,
  'nobody else gets the order by its code');
select tests.clear_authentication();

select tests.expire_reservation(:'late_order');
-- now() is frozen inside one transaction, so the first order is moved back in time like in real use
update public.orders o set created_at = now() - interval '1 hour' where o.id = :'late_order';
select tests.authenticate_as(:'late_customer');
select is(
  (select row(m.status, m.cancel_reason, m.seconds_left)::text from public.my_checkout_order() m),
  '(cancelled,reservation_expired,)',
  'an expired reservation is cancelled on read and still offered for a late proof');
select tests.clear_authentication();

select tests.reserve(:'late_customer', tests.items(:newer_variant)) as newer_order \gset
select tests.upload_proof(:'newer_order') as newer_proof \gset
select tests.authenticate_as(:'late_customer');
select public.submit_payment_proof(:'newer_order', :'newer_proof');
select is((select count(*) from public.my_checkout_order()), 0::bigint,
  'without a code nothing is returned once the latest order has its proof');
select is(
  (select m.status from public.my_checkout_order((tests.order_row(:'newer_order')).code) m),
  'proof_uploaded', 'with a code the customer gets the order in any status');
select is(
  (select m.seconds_left from public.my_checkout_order((tests.order_row(:'newer_order')).code) m),
  null, 'only pending orders have seconds left');
select is(
  (select m.customer_phone from public.my_checkout_order((tests.order_row(:'newer_order')).code) m),
  (tests.order_row(:'newer_order')).customer_phone, 'the customer gets the phone the owner will write to');
select tests.clear_authentication();

select tests.authenticate_as(:'admin_id', true);
select public.cancel_order(:'newer_order', 'Pago no recibido');
select tests.clear_authentication();
select tests.authenticate_as(:'late_customer');
select is(
  (select m.status_before_cancel from public.my_checkout_order((tests.order_row(:'newer_order')).code) m),
  'proof_uploaded', 'a rejected proof is told apart from other cancellations');
select tests.clear_authentication();

-- Expired QR

select tests.create_user('qr@test.bo') as qr_customer \gset

select tests.set_settings('{"qr_image_path": null}');
select tests.authenticate_as(:'qr_customer');
select throws_ok(
  format($$select public.reserve_order(%L, 'Ana Pérez', '71234567', 'pickup_point')$$, tests.items(:qr_variant)),
  'P0001', 'QR_CHECKOUT_DISABLED', 'QR checkout needs a QR image');
select tests.clear_authentication();

select tests.set_settings(jsonb_build_object('qr_image_path', 'qr/test.png', 'qr_expires_on', private.store_today() - 1));
select tests.authenticate_as(:'qr_customer');
select throws_ok(
  format($$select public.reserve_order(%L, 'Ana Pérez', '71234567', 'pickup_point')$$, tests.items(:qr_variant)),
  'P0001', 'QR_CHECKOUT_DISABLED', 'an expired QR refuses new orders before the daily job runs');
select tests.clear_authentication();

select tests.set_settings(jsonb_build_object('qr_expires_on', private.store_today()));
select tests.authenticate_as(:'qr_customer');
select lives_ok(
  format($$select public.reserve_order(%L, 'Ana Pérez', '71234567', 'pickup_point')$$, tests.items(:qr_variant)),
  'the QR still works on its expiry date in La Paz');
select tests.clear_authentication();

select is(private.close_expired_qr(), false, 'the daily job keeps a QR that expires today');
select tests.set_settings(jsonb_build_object('qr_expires_on', private.store_today() - 1));
select is(private.close_expired_qr(), true, 'the daily job turns off an expired QR');
select is((select qr_checkout_enabled from public.settings), false, 'QR checkout is off in the settings');
select is(
  (select a.reason from public.audit_log a
   where a.table_name = 'settings' and a.new_data ->> 'qr_checkout_enabled' = 'false'
   order by a.id desc limit 1),
  'qr_expired', 'the change is audited with its reason');
select is(
  (select j.schedule from cron.job j where j.jobname = 'close-expired-qr'),
  '5 4 * * *', 'pg_cron checks the QR every day at 00:05 in La Paz');

select * from finish();
rollback;
