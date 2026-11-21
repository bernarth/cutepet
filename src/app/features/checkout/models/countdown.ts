/**
 * @description Counts from what the server said, using elapsed time instead of the phone clock,
 * so a wrong clock on the phone does not change the countdown
 */
export function remainingSeconds(startSeconds: number, elapsedMs: number): number {
  return Math.max(0, Math.ceil(startSeconds - elapsedMs / 1000));
}

/**
 * @description "14:05". Minutes are not capped at 59 because a reservation can last longer than an hour
 */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
