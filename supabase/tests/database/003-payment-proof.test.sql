begin;
select plan(17);

select tests.set_settings('{"qr_checkout_enabled": true, "qr_image_path": "qr/test.png", "qr_expires_on": null}');
select tests.create_variant() as variant_on_time \gset
select tests.create_variant() as variant_late_free \gset
select tests.create_variant() as variant_late_gone \gset
select tests.create_variant() as variant_rejected \gset
select tests.create_user('a@test.bo') as customer_a \gset
select tests.create_user('b@test.bo') as customer_b \gset
select tests.create_user('c@test.bo') as customer_c \gset
select tests.create_user('d@test.bo') as customer_d \gset
select tests.create_user('admin@test.bo') as admin_id \gset

select tests.reserve(:'customer_a', tests.items(:variant_on_time)) as order_on_time \gset
select tests.upload_proof(:'order_on_time') as proof_on_time \gset

select tests.authenticate_as(:'customer_a');
select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', %L)$$, :'order_on_time' || '/extra.jpg'),
  'the owner can upload a proof into the order folder');
select throws_ok(
  format('select public.submit_payment_proof(%L, %L)', :'order_on_time', 'otra-carpeta/proof.jpg'),
  'P0001', 'INVALID_PROOF_PATH', 'the proof must be inside the order folder');
select throws_ok(
  format('select public.submit_payment_proof(%L, %L)', :'order_on_time', :'order_on_time' || '/missing.jpg'),
  'P0001', 'INVALID_PROOF_PATH', 'the proof file must exist in storage');
select tests.clear_authentication();

select tests.authenticate_as(:'customer_b');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('payment-proofs', %L)$$, :'order_on_time' || '/fake.jpg'),
  '42501', null, 'nobody else can upload into the order folder');
select throws_ok(
  format('select public.submit_payment_proof(%L, %L)', :'order_on_time', :'proof_on_time'),
  'P0001', 'ORDER_NOT_FOUND', 'only the owner can submit the proof');
select tests.clear_authentication();

select tests.authenticate_as(:'customer_a');
select public.submit_payment_proof(:'order_on_time', :'proof_on_time');
select tests.clear_authentication();

select is((tests.order_row(:'order_on_time')).status, 'proof_uploaded', 'an on time proof moves to proof_uploaded');
select is((tests.order_row(:'order_on_time')).payment_proof_path, :'proof_on_time', 'the proof path is stored');

select tests.expire_reservation(:'order_on_time');
select is((select available_stock from public.catalog_variants where id = :variant_on_time), 0,
  'after the proof the item stays locked with no expiry');

select tests.reserve(:'customer_b', tests.items(:variant_late_free)) as order_late_free \gset
select tests.expire_reservation(:'order_late_free');
select tests.upload_proof(:'order_late_free') as proof_late_free \gset
select tests.authenticate_as(:'customer_b');
select public.submit_payment_proof(:'order_late_free', :'proof_late_free');
select tests.clear_authentication();

select is((tests.order_row(:'order_late_free')).status, 'proof_uploaded', 'a late proof with free items is accepted');
select is((tests.order_row(:'order_late_free')).needs_attention, false, 'and needs no attention');
select is((select available_stock from public.catalog_variants where id = :variant_late_free), 0,
  'the late proof takes the items again');

select tests.reserve(:'customer_c', tests.items(:variant_late_gone)) as order_late_gone \gset
select tests.expire_reservation(:'order_late_gone');
select tests.reserve(:'customer_d', tests.items(:variant_late_gone)) as order_taker \gset
select tests.upload_proof(:'order_late_gone') as proof_late_gone \gset
select tests.authenticate_as(:'customer_c');
select public.submit_payment_proof(:'order_late_gone', :'proof_late_gone');
select tests.clear_authentication();

select is((tests.order_row(:'order_late_gone')).status, 'proof_uploaded', 'a late proof is stored even if an item is gone');
select is((tests.order_row(:'order_late_gone')).needs_attention, true, 'and the order needs attention');
select is((tests.order_row(:'order_late_gone')).payment_proof_path, :'proof_late_gone', 'the payment proof is never lost');
select is(private.held_quantity(:variant_late_gone), 1, 'an order that needs attention holds no stock');

select tests.reserve(:'customer_a', tests.items(:variant_rejected)) as order_rejected \gset
select tests.authenticate_as(:'admin_id', true);
select public.cancel_order(:'order_rejected', 'Comprobante ilegible');
select tests.clear_authentication();
select tests.upload_proof(:'order_rejected') as proof_rejected \gset

select tests.authenticate_as(:'customer_a');
select throws_ok(
  format('select public.submit_payment_proof(%L, %L)', :'order_rejected', :'proof_rejected'),
  'P0001', 'INVALID_STATUS', 'an order cancelled by an admin rejects new proofs');
select tests.clear_authentication();

select is(
  (select count(*)::integer from public.audit_log a
   where a.record_id = :'order_late_gone' and a.reason = 'late_payment_proof'),
  1, 'the late proof is audited');

select * from finish();
rollback;
