import { ProductDetailRow, VariantRow, toProductDetail, toProductSummary } from './product.mapper';

const photoUrl = (path: string) => `https://cdn.test/${path}`;

function variantRow(overrides: Partial<VariantRow>): VariantRow {
  return {
    id: 1,
    size_id: 1,
    stock: 1,
    available_stock: 1,
    neck_cm: null,
    chest_cm: null,
    back_length_cm: null,
    tolerance_cm: null,
    sizes: { label: '1', sort_order: 1 },
    ...overrides,
  };
}

function detailRow(overrides: Partial<ProductDetailRow>): ProductDetailRow {
  return {
    slug: 'abrigo',
    name: 'Abrigo',
    price: 120,
    catalog_status: 'available',
    production_days: null,
    description: 'Suave',
    pet_types: { name: 'Perro' },
    categories: { name: 'Abrigos' },
    product_photos: [],
    catalog_variants: [],
    ...overrides,
  };
}

describe('toProductSummary', () => {
  it('uses the first photo by sort order with a public URL', () => {
    const summary = toProductSummary(
      detailRow({
        product_photos: [
          { storage_path: 'b.png', alt_text: 'Espalda', sort_order: 2 },
          { storage_path: 'a.png', alt_text: 'Frente', sort_order: 1 },
        ],
      }),
      photoUrl,
    );
    expect(summary.photo).toEqual({ url: 'https://cdn.test/a.png', alt: 'Frente' });
  });

  it('has no photo when the product has none', () => {
    expect(toProductSummary(detailRow({}), photoUrl).photo).toBeNull();
  });
});

describe('toProductDetail', () => {
  it('sorts variants by size order', () => {
    const detail = toProductDetail(
      detailRow({
        catalog_variants: [
          variantRow({ id: 2, sizes: { label: '2', sort_order: 5 } }),
          variantRow({ id: 1, sizes: { label: '000', sort_order: 1 } }),
        ],
      }),
      photoUrl,
    );
    expect(detail.variants.map((variant) => variant.sizeLabel)).toEqual(['000', '2']);
  });

  it('derives the availability of each variant', () => {
    const detail = toProductDetail(
      detailRow({
        catalog_variants: [
          variantRow({ id: 1, stock: 1, available_stock: 1 }),
          variantRow({ id: 2, stock: 1, available_stock: 0 }),
          variantRow({ id: 3, stock: 0, available_stock: 0 }),
        ],
      }),
      photoUrl,
    );
    expect(detail.variants.map((variant) => variant.availability)).toEqual([
      'available',
      'reserved',
      'sold_out',
    ]);
  });

  it('treats every made-to-order variant as available', () => {
    const detail = toProductDetail(
      detailRow({
        catalog_status: 'made_to_order',
        catalog_variants: [variantRow({ stock: 0, available_stock: 0 })],
      }),
      photoUrl,
    );
    expect(detail.variants[0].availability).toBe('available');
  });

  it('keeps only the exact measurements that exist', () => {
    const detail = toProductDetail(
      detailRow({
        catalog_variants: [
          variantRow({ id: 1, chest_cm: 38.5, back_length_cm: 27 }),
          variantRow({ id: 2 }),
        ],
      }),
      photoUrl,
    );
    expect(detail.variants[0].exactMeasurements).toEqual({ chest: 38.5, backLength: 27 });
    expect(detail.variants[1].exactMeasurements).toBeNull();
  });
});
