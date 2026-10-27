import { Database } from '@core/supabase/database.types';

import { Measurements } from './size';

export type CatalogStatus = Database['public']['Enums']['catalog_status'];

export type VariantAvailability = 'available' | 'reserved' | 'sold_out';

export const VARIANT_AVAILABILITY_SUFFIX: Readonly<Record<VariantAvailability, string>> = {
  available: '',
  reserved: ' (reservada)',
  sold_out: ' (vendida)',
};

export interface Photo {
  readonly url: string;
  readonly alt: string;
}

export interface ProductSummary {
  readonly slug: string;
  readonly name: string;
  readonly price: number;
  readonly status: CatalogStatus;
  readonly productionDays: number | null;
  readonly photo: Photo | null;
}

export interface Variant {
  readonly id: number;
  readonly sizeId: number;
  readonly sizeLabel: string;
  readonly availability: VariantAvailability;
  readonly exactMeasurements: Measurements | null;
  readonly toleranceCm: number | null;
}

export interface ProductDetail extends ProductSummary {
  readonly description: string;
  readonly petTypeName: string;
  readonly categoryName: string;
  readonly photos: readonly Photo[];
  readonly variants: readonly Variant[];
}

/** Badge text for a product, or null when it is simply available */
export function statusLabel(
  product: Pick<ProductSummary, 'status' | 'productionDays'>,
): string | null {
  switch (product.status) {
    case 'reserved':
      return 'Reservada';
    case 'sold_out':
      return 'Vendida';
    case 'made_to_order':
      return `Hecha a pedido · lista en ${product.productionDays ?? 0} días`;
    default:
      return null;
  }
}
