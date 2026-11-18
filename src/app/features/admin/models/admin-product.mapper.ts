import {
  AdminProduct,
  AdminProductStatus,
  AdminProductSummary,
  AdminVariant,
  ProductListFilter,
} from './admin-product';

interface StockRow {
  readonly stock: number | null;
  readonly available_stock: number | null;
}

export interface AdminVariantRow extends StockRow {
  readonly id: number | null;
  readonly size_id: number | null;
  readonly neck_cm: number | null;
  readonly chest_cm: number | null;
  readonly back_length_cm: number | null;
  readonly tolerance_cm: number | null;
  readonly sizes: { readonly label: string; readonly sort_order: number } | null;
  readonly order_items: readonly { readonly count: number }[];
}

export interface AdminProductSummaryRow {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly is_active: boolean;
  readonly catalog_variants: readonly StockRow[];
  readonly product_photos: readonly { readonly storage_path: string }[];
}

export interface AdminProductRow {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly pet_type_id: number;
  readonly category_id: number;
  readonly price: number;
  readonly is_active: boolean;
  readonly catalog_variants: readonly AdminVariantRow[];
}

export function productStatus(
  isActive: boolean,
  variants: readonly StockRow[],
): AdminProductStatus {
  if (!isActive) {
    return 'archived';
  }
  if (variants.length === 0) {
    return 'no_sizes';
  }
  if (sumOf(variants, 'available_stock') > 0) {
    return 'available';
  }
  return sumOf(variants, 'stock') > 0 ? 'reserved' : 'sold_out';
}

export function toAdminProductSummary(
  row: AdminProductSummaryRow,
  photoUrl: (storagePath: string) => string,
): AdminProductSummary {
  const [photo] = row.product_photos;

  return {
    id: row.id,
    name: row.name,
    price: row.price,
    status: productStatus(row.is_active, row.catalog_variants),
    photoUrl: photo ? photoUrl(photo.storage_path) : null,
    stockUnits: sumOf(row.catalog_variants, 'stock'),
    availableUnits: sumOf(row.catalog_variants, 'available_stock'),
  };
}

export function toAdminProduct(row: AdminProductRow): AdminProduct {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    petTypeId: row.pet_type_id,
    categoryId: row.category_id,
    price: row.price,
    isActive: row.is_active,
    variants: row.catalog_variants
      .map(toAdminVariant)
      .sort((a, b) => a.sizeSortOrder - b.sizeSortOrder),
  };
}

export function matchesProductFilter(
  product: AdminProductSummary,
  filter: ProductListFilter,
  search: string,
): boolean {
  const statusMatches =
    filter === 'archived'
      ? product.status === 'archived'
      : filter === 'sold_out'
        ? product.status === 'sold_out'
        : product.status !== 'archived' && product.status !== 'sold_out';

  return statusMatches && normalizeText(product.name).includes(normalizeText(search.trim()));
}

/**
 * @description Lowercase without accents, so "abrigo" finds "Abrigo Ñandú"
 */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function toAdminVariant(row: AdminVariantRow): AdminVariant {
  return {
    id: row.id ?? 0,
    sizeId: row.size_id ?? 0,
    ...sizeOf(row),
    neckCm: row.neck_cm,
    chestCm: row.chest_cm,
    backLengthCm: row.back_length_cm,
    toleranceCm: row.tolerance_cm,
    stock: row.stock ?? 0,
    availableStock: row.available_stock ?? 0,
    hasOrders: (row.order_items[0]?.count ?? 0) > 0,
  };
}

function sizeOf(row: AdminVariantRow): Pick<AdminVariant, 'sizeLabel' | 'sizeSortOrder'> {
  return { sizeLabel: row.sizes?.label ?? '', sizeSortOrder: row.sizes?.sort_order ?? 0 };
}

function sumOf(rows: readonly StockRow[], column: keyof StockRow): number {
  return rows.reduce((total, row) => total + (row[column] ?? 0), 0);
}

export function adminProductStatus(product: AdminProduct): AdminProductStatus {
  return productStatus(
    product.isActive,
    product.variants.map((variant) => ({
      stock: variant.stock,
      available_stock: variant.availableStock,
    })),
  );
}
