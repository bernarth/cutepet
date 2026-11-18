-- Limits agreed for step 5: reservations up to 60 minutes and a size tolerance from 0 (exact fit) to 10 cm.
alter table public.settings
  drop constraint settings_reservation_minutes_check,
  add constraint settings_reservation_minutes_check check (reservation_minutes between 5 and 60),
  drop constraint settings_size_tolerance_cm_check,
  add constraint settings_size_tolerance_cm_check check (size_tolerance_cm between 0 and 10);
