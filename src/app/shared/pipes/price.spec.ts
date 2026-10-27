import { formatPrice } from './price';

describe('formatPrice', () => {
  it('shows whole amounts without decimals', () => {
    expect(formatPrice(120)).toBe('Bs 120');
  });

  it('shows cents with a decimal comma', () => {
    expect(formatPrice(120.5)).toBe('Bs 120,50');
  });

  it('groups thousands', () => {
    expect(formatPrice(1500)).toBe('Bs 1.500');
  });
});
