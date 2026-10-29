import { Database } from '@core/supabase/database.types';

import { Measurements } from './size';

export type CatalogStatus = Database['public']['Enums']['catalog_status'];

export interface Photo {
  readonly url: string;
  readonly alt: string;
}

export interface ProductSummary {
  readonly slug: string;
  readonly name: string;
  readonly price: number;
  readonly status: CatalogStatus;
  readonly photo: Photo | null;
}

/**
 * @description Only sizes that still have stock. A reserved size is held by someone who is paying
 */
export interface Variant {
  readonly id: number;
  readonly sizeId: number;
  readonly sizeLabel: string;
  readonly isReserved: boolean;
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

/**
 * @description A sold out product carries no details: customers only see a friendly notice
 */
export type ProductLookup =
  | { readonly kind: 'found'; readonly product: ProductDetail }
  | { readonly kind: 'sold_out' }
  | { readonly kind: 'not_found' };
