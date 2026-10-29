import {
  CartLine,
  addLine,
  countUnits,
  limitQuantity,
  parseStoredCart,
  quantityInCart,
  removeLines,
} from './cart-line';

const coat = { variantId: 1, productName: 'Abrigo Osito', sizeLabel: '1' };
const dress = { variantId: 2, productName: 'Vestido Floral', sizeLabel: '0' };

describe('addLine', () => {
  it('adds a new piece with one unit', () => {
    expect(addLine([], coat, 1)).toEqual([{ ...coat, quantity: 1 }]);
  });

  it('adds one more unit of the same piece while there is stock', () => {
    const lines = addLine(addLine([], coat, 2), coat, 2);
    expect(lines).toEqual([{ ...coat, quantity: 2 }]);
  });

  it('never goes above the available stock', () => {
    const lines = addLine([], coat, 1);
    expect(addLine(lines, coat, 1)).toBe(lines);
  });

  it('does not add a piece with no units available', () => {
    expect(addLine([], coat, 0)).toEqual([]);
  });
});

describe('removeLines and limitQuantity', () => {
  const lines: CartLine[] = [
    { ...coat, quantity: 3 },
    { ...dress, quantity: 1 },
  ];

  it('removes the given pieces', () => {
    expect(removeLines(lines, [1])).toEqual([{ ...dress, quantity: 1 }]);
  });

  it('lowers the quantity only when it is above the limit', () => {
    expect(limitQuantity(lines, 1, 2)[0].quantity).toBe(2);
    expect(limitQuantity(lines, 2, 5)[1].quantity).toBe(1);
  });

  it('counts units and finds the quantity of a piece', () => {
    expect(countUnits(lines)).toBe(4);
    expect(quantityInCart(lines, 1)).toBe(3);
    expect(quantityInCart(lines, 9)).toBe(0);
  });
});

describe('parseStoredCart', () => {
  it('reads a valid cart', () => {
    const raw = JSON.stringify([{ ...coat, quantity: 1 }]);
    expect(parseStoredCart(raw)).toEqual([{ ...coat, quantity: 1 }]);
  });

  it('returns an empty cart for missing or broken data', () => {
    expect(parseStoredCart(null)).toEqual([]);
    expect(parseStoredCart('{not json')).toEqual([]);
    expect(parseStoredCart('{"variantId":1}')).toEqual([]);
  });

  it('drops invalid lines and repeated pieces', () => {
    const raw = JSON.stringify([
      { ...coat, quantity: 1, extra: 'ignored' },
      { ...coat, quantity: 2 },
      { ...dress, quantity: 0 },
      { ...dress, quantity: 1.5 },
      { variantId: 3, quantity: 1 },
      null,
    ]);
    expect(parseStoredCart(raw)).toEqual([{ ...coat, quantity: 1 }]);
  });
});
