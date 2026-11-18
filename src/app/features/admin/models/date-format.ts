const STORE_TIME_ZONE = 'America/La_Paz';

const dateTime = new Intl.DateTimeFormat('es-BO', {
  timeZone: STORE_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * @example "18 nov, 14:05" in La Paz time, whatever the device time zone
 */
export function formatDateTime(isoTimestamp: string): string {
  return dateTime.format(new Date(isoTimestamp));
}
