import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import {
  EMPTY_QUICK_SALE,
  QuickSaleModel,
  SaleOption,
  addLine,
  isLineAvailable,
  quickSaleSchema,
  removeLine,
  toQuickSaleRequest,
} from './quick-sale';

const coat: SaleOption = {
  variantId: 1,
  productName: 'Abrigo Osito',
  sizeLabel: '1',
  unitPrice: 120,
  available: 2,
};

const sale: QuickSaleModel = {
  ...EMPTY_QUICK_SALE,
  lines: [
    { variantId: 1, quantity: 1, productName: 'Abrigo Osito', sizeLabel: '1', unitPrice: 120 },
  ],
  customerName: '  Eva Mamani ',
  customerPhone: '71234567',
};

function errorsOf(model: QuickSaleModel) {
  const saleForm = TestBed.runInInjectionContext(() => form(signal(model), quickSaleSchema));
  return {
    valid: saleForm().valid(),
    lines: saleForm
      .lines()
      .errors()
      .map((error) => error.message),
    phone: saleForm
      .customerPhone()
      .errors()
      .map((error) => error.message),
  };
}

describe('addLine', () => {
  it('adds a size and then one more unit, up to what is available', () => {
    const once = addLine([], coat);
    const twice = addLine(once, coat);

    expect(once).toEqual([
      { variantId: 1, quantity: 1, productName: 'Abrigo Osito', sizeLabel: '1', unitPrice: 120 },
    ]);
    expect(twice[0].quantity).toBe(2);
    expect(addLine(twice, coat)[0].quantity).toBe(2);
  });

  it('removes a size', () => {
    expect(removeLine(addLine([], coat), 1)).toEqual([]);
  });

  it('flags a line that sold out or has fewer units now', () => {
    const [line] = addLine(addLine([], coat), coat);

    expect(isLineAvailable(line, new Map([[1, coat]]))).toBe(true);
    expect(isLineAvailable(line, new Map([[1, { ...coat, available: 1 }]]))).toBe(false);
    expect(isLineAvailable(line, new Map())).toBe(false);
  });
});

describe('quick sale form', () => {
  it('accepts a pickup sale with items, name and a Bolivian mobile', () => {
    expect(errorsOf(sale).valid).toBe(true);
  });

  it('needs at least one item and a mobile starting with 6 or 7', () => {
    const errors = errorsOf({ ...sale, lines: [], customerPhone: '22123456' });

    expect(errors.lines).toEqual(['Agrega al menos una prenda']);
    expect(errors.phone).toEqual(['Usa 8 dígitos que empiecen con 6 o 7']);
  });
});

describe('toQuickSaleRequest', () => {
  it('sends the items with the customer details', () => {
    expect(toQuickSaleRequest({ ...sale, destinationCity: 'Oruro' })).toEqual({
      items: [{ variant_id: 1, quantity: 1 }],
      customer_name: 'Eva Mamani',
      customer_phone: '71234567',
      delivery_method: 'pickup_point',
    });
  });
});
