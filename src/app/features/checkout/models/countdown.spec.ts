import { formatCountdown, remainingSeconds } from './countdown';

describe('remainingSeconds', () => {
  it('counts down from what the server said', () => {
    expect(remainingSeconds(900, 0)).toBe(900);
    expect(remainingSeconds(900, 1500)).toBe(899);
    expect(remainingSeconds(900, 60_000)).toBe(840);
  });

  it('never goes below zero', () => {
    expect(remainingSeconds(5, 9000)).toBe(0);
  });
});

describe('formatCountdown', () => {
  it('shows minutes and two digit seconds', () => {
    expect(formatCountdown(845)).toBe('14:05');
    expect(formatCountdown(59)).toBe('0:59');
    expect(formatCountdown(0)).toBe('0:00');
  });

  it('keeps counting minutes past one hour', () => {
    expect(formatCountdown(3725)).toBe('62:05');
  });
});
