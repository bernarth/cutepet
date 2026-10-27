import { ProductDetail, Variant } from './product';
import { productMetaDescription } from './product-meta';

function variant(sizeLabel: string, availability: Variant['availability']): Variant {
  return { id: 1, sizeId: 1, sizeLabel, availability, exactMeasurements: null, toleranceCm: null };
}

function product(overrides: Partial<ProductDetail>): ProductDetail {
  return {
    slug: 'abrigo',
    name: 'Abrigo',
    price: 120,
    status: 'available',
    productionDays: null,
    photo: null,
    description: 'Suave y abrigado.',
    petTypeName: 'Perro',
    categoryName: 'Abrigos',
    photos: [],
    variants: [],
    ...overrides,
  };
}

describe('productMetaDescription', () => {
  it('includes the price and the available sizes', () => {
    const text = productMetaDescription(
      product({
        variants: [variant('0', 'available'), variant('1', 'available'), variant('2', 'sold_out')],
      }),
    );
    expect(text).toMatch(/^Bs\s?120,00 · Tallas 0 y 1\. Suave y abrigado\.$/);
  });

  it('says reserved when no size is free', () => {
    expect(productMetaDescription(product({ variants: [variant('1', 'reserved')] }))).toContain(
      'Reservada',
    );
  });

  it('hides the price of a sold item', () => {
    const text = productMetaDescription(product({ status: 'sold_out' }));
    expect(text).toBe('Ya vendida. Pide una parecida a tu medida. Suave y abrigado.');
  });
});
