import { ProductDetail } from './product';
import { ProductDetailRow, VariantRow, toProductLookup, toProductSummary } from './product.mapper';

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

function foundProduct(row: ProductDetailRow): ProductDetail {
  const lookup = toProductLookup(row, photoUrl);
  if (lookup.kind !== 'found') {
    throw new Error(`expected a product, got ${lookup.kind}`);
  }
  return lookup.product;
}

describe('toProductLookup', () => {
  it('reports a missing row as not found', () => {
    expect(toProductLookup(null, photoUrl)).toEqual({ kind: 'not_found' });
  });

  it('hides every detail of a sold out product', () => {
    expect(toProductLookup(detailRow({ catalog_status: 'sold_out' }), photoUrl)).toEqual({
      kind: 'sold_out',
    });
  });

  it('sorts sizes by size order', () => {
    const product = foundProduct(
      detailRow({
        catalog_variants: [
          variantRow({ id: 2, sizes: { label: '2', sort_order: 5 } }),
          variantRow({ id: 1, sizes: { label: '000', sort_order: 1 } }),
        ],
      }),
    );
    expect(product.variants.map((variant) => variant.sizeLabel)).toEqual(['000', '2']);
  });

  it('drops sold out sizes and marks reserved ones', () => {
    const product = foundProduct(
      detailRow({
        catalog_variants: [
          variantRow({ id: 1, stock: 1, available_stock: 1 }),
          variantRow({ id: 2, stock: 1, available_stock: 0 }),
          variantRow({ id: 3, stock: 0, available_stock: 0 }),
        ],
      }),
    );
    expect(product.variants.map((variant) => [variant.id, variant.isReserved])).toEqual([
      [1, false],
      [2, true],
    ]);
  });

  it('keeps only the exact measurements that exist', () => {
    const product = foundProduct(
      detailRow({
        catalog_variants: [
          variantRow({ id: 1, chest_cm: 38.5, back_length_cm: 27 }),
          variantRow({ id: 2 }),
        ],
      }),
    );
    expect(product.variants[0].exactMeasurements).toEqual({ chest: 38.5, backLength: 27 });
    expect(product.variants[1].exactMeasurements).toBeNull();
  });
});
