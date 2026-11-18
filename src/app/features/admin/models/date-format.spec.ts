import { formatDateTime } from './date-format';

describe('formatDateTime', () => {
  it('shows La Paz time, 4 hours behind UTC', () => {
    expect(formatDateTime('2026-11-18T18:05:00Z')).toMatch(/18 nov.*14:05/);
  });
});
