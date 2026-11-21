begin;
select plan(4);

select tests.set_settings('{"qr_checkout_enabled": true, "qr_image_path": "qr/test.png", "qr_expires_on": null, "reservation_minutes": 15}');
select tests.create_variant() as variant_a \gset
select tests.create_variant() as variant_b \gset
select tests.create_user('admin@test.bo') as admin_id \gset
select tests.create_user('a@test.bo') as customer_a \gset

select tests.reserve(:'admin_id', tests.items(:variant_a)) as admin_order \gset
select tests.reserve(:'customer_a', tests.items(:variant_b)) as customer_order \gset

select tests.authenticate_as(:'admin_id', true);
select public.cancel_order(:'admin_order');
select throws_ok(format('select public.cancel_order(%L)', :'customer_order'), 'P0001', 'REASON_REQUIRED',
  'an admin still needs a reason to cancel the order of someone else');
select tests.clear_authentication();

select is((tests.order_row(:'admin_order')).status, 'cancelled',
  'an admin who bought through the store cancels their own order from the payment screen');
select is((tests.order_row(:'admin_order')).cancel_reason, 'cancelled_by_customer',
  'with the customer reason');
select is((tests.order_row(:'customer_order')).status, 'pending_payment',
  'the order of someone else stays pending');

select * from finish();
rollback;
