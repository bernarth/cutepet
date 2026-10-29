import { itemsTotal, pickupFee } from './cart-summary';

const rule = { fee: 2, freeFromUnits: 3 };

describe('itemsTotal', () => {
  it('adds price times quantity without floating point errors', () => {
    expect(itemsTotal([{ unitPrice: 0.1, quantity: 3 }])).toBe(0.3);
    expect(
      itemsTotal([
        { unitPrice: 120.5, quantity: 1 },
        { unitPrice: 95, quantity: 2 },
      ]),
    ).toBe(310.5);
  });

  it('is zero for an empty cart', () => {
    expect(itemsTotal([])).toBe(0);
  });
});

describe('pickupFee', () => {
  it('charges the fee below the free threshold', () => {
    expect(pickupFee([{ unitPrice: 100, quantity: 2 }], rule)).toBe(2);
  });

  it('is free from the threshold, counting units', () => {
    expect(pickupFee([{ unitPrice: 100, quantity: 3 }], rule)).toBe(0);
    expect(
      pickupFee(
        [
          { unitPrice: 100, quantity: 2 },
          { unitPrice: 80, quantity: 2 },
        ],
        rule,
      ),
    ).toBe(0);
  });
});
