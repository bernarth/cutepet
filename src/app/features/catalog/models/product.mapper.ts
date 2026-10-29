import { Tables } from '@core/supabase/database.types';

import {
  CatalogStatus,
  Photo,
  ProductDetail,
  ProductLookup,
  ProductSummary,
  Variant,
} from './product';
import { Measurements, Size } from './size';

export type PhotoUrl = (storagePath: string) => string;

interface PhotoRow {
  readonly storage_path: string;
  readonly alt_text: string;
  readonly sort_order: number;
}

export interface ProductSummaryRow {
  readonly slug: string;
  readonly name: string;
  readonly price: number;
  readonly catalog_status: CatalogStatus | null;
  readonly product_photos: readonly PhotoRow[];
}

export interface VariantRow {
  readonly id: number;
  readonly size_id: number;
  readonly stock: number;
  readonly available_stock: number | null;
  readonly neck_cm: number | null;
  readonly chest_cm: number | null;
  readonly back_length_cm: number | null;
  readonly tolerance_cm: number | null;
  readonly sizes: { readonly label: string; readonly sort_order: number } | null;
}

export interface ProductDetailRow extends ProductSummaryRow {
  readonly description: string;
  readonly pet_types: { readonly name: string } | null;
  readonly categories: { readonly name: string } | null;
  readonly catalog_variants: readonly VariantRow[];
}

export function toProductSummary(row: ProductSummaryRow, photoUrl: PhotoUrl): ProductSummary {
  const [photo] = toPhotos(row.product_photos, photoUrl);
  return {
    slug: row.slug,
    name: row.name,
    price: row.price,
    status: row.catalog_status ?? 'sold_out',
    photo: photo ?? null,
  };
}

export function toProductLookup(row: ProductDetailRow | null, photoUrl: PhotoUrl): ProductLookup {
  if (!row) {
    return { kind: 'not_found' };
  }
  if (row.catalog_status === 'sold_out') {
    return { kind: 'sold_out' };
  }
  return { kind: 'found', product: toProductDetail(row, photoUrl) };
}

function toProductDetail(row: ProductDetailRow, photoUrl: PhotoUrl): ProductDetail {
  const variants = row.catalog_variants
    .filter((variant) => variant.stock > 0)
    .sort((a, b) => (a.sizes?.sort_order ?? 0) - (b.sizes?.sort_order ?? 0))
    .map(toVariant);

  return {
    ...toProductSummary(row, photoUrl),
    description: row.description,
    petTypeName: row.pet_types?.name ?? '',
    categoryName: row.categories?.name ?? '',
    photos: toPhotos(row.product_photos, photoUrl),
    variants,
  };
}

export function toSize(row: Tables<'sizes'>): Size {
  return {
    id: row.id,
    label: row.label,
    sortOrder: row.sort_order,
    neck: { min: row.neck_min, max: row.neck_max },
    chest: { min: row.chest_min, max: row.chest_max },
    backLength: { min: row.back_length_min, max: row.back_length_max },
  };
}

function toVariant(row: VariantRow): Variant {
  return {
    id: row.id,
    sizeId: row.size_id,
    sizeLabel: row.sizes?.label ?? '',
    availableStock: row.available_stock ?? 0,
    isReserved: (row.available_stock ?? 0) === 0,
    exactMeasurements: toMeasurements(row),
    toleranceCm: row.tolerance_cm,
  };
}

function toMeasurements(row: VariantRow): Measurements | null {
  const measurements: Measurements = {
    ...(row.neck_cm !== null && { neck: row.neck_cm }),
    ...(row.chest_cm !== null && { chest: row.chest_cm }),
    ...(row.back_length_cm !== null && { backLength: row.back_length_cm }),
  };
  return Object.keys(measurements).length > 0 ? measurements : null;
}

function toPhotos(rows: readonly PhotoRow[], photoUrl: PhotoUrl): Photo[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({ url: photoUrl(row.storage_path), alt: row.alt_text }));
}
