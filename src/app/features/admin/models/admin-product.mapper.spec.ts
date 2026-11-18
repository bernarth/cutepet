import { AdminProductSummary } from './admin-product';
import {
  AdminProductRow,
  matchesProductFilter,
  productStatus,
  toAdminProduct,
} from './admin-product.mapper';

const summary = (overrides: Partial<AdminProductSummary>): AdminProductSummary => ({
  id: 1,
  name: 'Abrigo Ñandú',
  price: 120,
  status: 'available',
  photoUrl: null,
  stockUnits: 1,
  availableUnits: 1,
  ...overrides,
});

describe('productStatus', () => {
  it('puts archived before anything else', () => {
    expect(productStatus(false, [{ stock: 1, available_stock: 1 }])).toBe('archived');
  });

  it('tells apart a new product, available, reserved and sold out', () => {
    expect(productStatus(true, [])).toBe('no_sizes');
    expect(productStatus(true, [{ stock: 2, available_stock: 1 }])).toBe('available');
    expect(productStatus(true, [{ stock: 1, available_stock: 0 }])).toBe('reserved');
    expect(productStatus(true, [{ stock: 0, available_stock: 0 }])).toBe('sold_out');
  });
});

describe('matchesProductFilter', () => {
  it('shows new, available and reserved products as for sale', () => {
    expect(matchesProductFilter(summary({ status: 'no_sizes' }), 'for_sale', '')).toBe(true);
    expect(matchesProductFilter(summary({ status: 'reserved' }), 'for_sale', '')).toBe(true);
    expect(matchesProductFilter(summary({ status: 'sold_out' }), 'for_sale', '')).toBe(false);
    expect(matchesProductFilter(summary({ status: 'archived' }), 'for_sale', '')).toBe(false);
  });

  it('searches the name ignoring case and accents', () => {
    expect(matchesProductFilter(summary({}), 'for_sale', ' nandu ')).toBe(true);
    expect(matchesProductFilter(summary({}), 'for_sale', 'vestido')).toBe(false);
  });
});

describe('toAdminProduct', () => {
  it('orders photos so the cover comes first', () => {
    const row: AdminProductRow = {
      id: 1,
      name: 'Abrigo',
      slug: 'abrigo',
      description: '',
      pet_type_id: 1,
      category_id: 1,
      price: 120,
      is_active: true,
      catalog_variants: [],
      product_photos: [
        { id: 8, storage_path: 'b.jpg', alt_text: 'Abrigo foto 2', sort_order: 2 },
        { id: 7, storage_path: 'a.jpg', alt_text: 'Abrigo foto 1', sort_order: 1 },
      ],
    };

    const photos = toAdminProduct(row, (path) => `https://cdn/${path}`).photos;

    expect(photos.map((photo) => photo.url)).toEqual(['https://cdn/a.jpg', 'https://cdn/b.jpg']);
  });

  it('sorts sizes by the size table and flags sizes that have orders', () => {
    const row: AdminProductRow = {
      id: 1,
      name: 'Abrigo',
      slug: 'abrigo',
      description: '',
      pet_type_id: 1,
      category_id: 1,
      price: 120,
      is_active: true,
      catalog_variants: [variantRow(2, '2', 5, 3), variantRow(1, '000', 1, 0)],
      product_photos: [],
    };

    const product = toAdminProduct(row, (path) => path);

    expect(product.variants.map((variant) => variant.sizeLabel)).toEqual(['000', '2']);
    expect(product.variants.map((variant) => variant.hasOrders)).toEqual([false, true]);
  });
});

function variantRow(id: number, label: string, sortOrder: number, orders: number) {
  return {
    id,
    size_id: id,
    stock: 1,
    available_stock: 1,
    neck_cm: null,
    chest_cm: null,
    back_length_cm: null,
    tolerance_cm: null,
    sizes: { label, sort_order: sortOrder },
    order_items: [{ count: orders }],
  };
}
