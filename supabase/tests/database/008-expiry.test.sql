begin;
select plan(5);

select tests.set_settings('{"qr_checkout_enabled": true}');
select tests.create_variant() as expiring_variant \gset
select tests.create_variant() as active_variant \gset
select tests.create_user('a@test.bo') as customer_a \gset
select tests.create_user('b@test.bo') as customer_b \gset

select tests.reserve(:'customer_a', tests.items(:expiring_variant)) as expiring_order \gset
select tests.reserve(:'customer_b', tests.items(:active_variant)) as active_order \gset
select tests.expire_reservation(:'expiring_order');

select is(private.expire_stale_orders(), 1, 'the expiry job cancels only expired reservations');
select is((tests.order_row(:'expiring_order')).cancel_reason, 'reservation_expired', 'with the expiry reason');
select is((tests.order_row(:'active_order')).status, 'pending_payment', 'active reservations are untouched');
select is(
  (select a.reason from public.audit_log a
   where a.record_id = :'expiring_order' and a.new_data ->> 'status' = 'cancelled'),
  'reservation_expired', 'the expiry is audited');
select is(
  (select j.schedule from cron.job j where j.jobname = 'expire-stale-orders'),
  '*/5 * * * *', 'pg_cron runs the expiry every 5 minutes');

select * from finish();
rollback;
