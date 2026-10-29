import { ProductDetail, Variant } from './product';
import { productMetaDescription } from './product-meta';

function variant(sizeLabel: string, isReserved = false): Variant {
  return {
    id: 1,
    sizeId: 1,
    sizeLabel,
    availableStock: isReserved ? 0 : 1,
    isReserved,
    exactMeasurements: null,
    toleranceCm: null,
  };
}

function product(variants: Variant[]): ProductDetail {
  return {
    slug: 'abrigo',
    name: 'Abrigo',
    price: 120,
    status: 'available',
    photo: null,
    description: 'Suave y abrigado.',
    petTypeName: 'Perro',
    categoryName: 'Abrigos',
    photos: [],
    variants,
  };
}

describe('productMetaDescription', () => {
  it('includes the price and the free sizes', () => {
    const text = productMetaDescription(product([variant('0'), variant('1'), variant('2', true)]));
    expect(text).toBe('Bs 120 · Tallas 0 y 1. Suave y abrigado.');
  });

  it('says someone is buying it when no size is free', () => {
    expect(productMetaDescription(product([variant('1', true)]))).toContain(
      'Alguien la está comprando',
    );
  });
});
