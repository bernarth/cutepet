import { CartLine } from '@core/cart/cart-line';

import { CartVariant, reviewCart, toCartItems } from './cart-item';

function line(variantId: number, quantity = 1): CartLine {
  return { variantId, quantity, productName: `Prenda ${variantId}`, sizeLabel: '1' };
}

function variant(id: number, stock: number, availableStock: number): CartVariant {
  return {
    id,
    stock,
    availableStock,
    productName: `Prenda ${id}`,
    slug: `prenda-${id}`,
    unitPrice: 100,
    photo: null,
    measurements: { neck: null, chest: null, backLength: null },
  };
}

const variants = new Map([
  [1, variant(1, 1, 1)],
  [2, variant(2, 1, 0)],
  [3, variant(3, 0, 0)],
  [5, variant(5, 3, 2)],
]);

describe('reviewCart', () => {
  it('treats a missing piece or one with no stock as sold', () => {
    const review = reviewCart([line(1), line(3), line(4)], variants);
    expect(review.soldIds).toEqual([3, 4]);
    expect(review.notices).toEqual([
      'Esta prenda ya fue vendida: Prenda 3 (Talla 1)',
      'Esta prenda ya fue vendida: Prenda 4 (Talla 1)',
    ]);
  });

  it('keeps reserved pieces without a notice', () => {
    expect(reviewCart([line(2)], variants)).toEqual({ soldIds: [], limits: [], notices: [] });
  });

  it('lowers a quantity above the units left', () => {
    const review = reviewCart([line(5, 3)], variants);
    expect(review.limits).toEqual([{ variantId: 5, maxQuantity: 2 }]);
    expect(review.notices).toEqual(['Solo queda 2 de Prenda 5 (Talla 1)']);
  });
});

describe('toCartItems', () => {
  it('drops sold pieces and marks reserved ones', () => {
    const items = toCartItems([line(1), line(2), line(3)], variants);
    expect(items.map((item) => [item.line.variantId, item.isReserved])).toEqual([
      [1, false],
      [2, true],
    ]);
  });
});
