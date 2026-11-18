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

/**
 * @description yyyy-mm-dd of the given moment in the browser's time zone
 */
export function isoDate(moment: Date): string {
  const offset = moment.getTimezoneOffset() * 60 * 1000;
  return new Date(moment.getTime() - offset).toISOString().slice(0, 10);
}
