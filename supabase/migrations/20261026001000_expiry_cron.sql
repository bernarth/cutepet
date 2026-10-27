create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'expire-stale-orders',
  '*/5 * * * *',
  'select private.expire_stale_orders()'
);
