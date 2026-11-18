export type AdminProductStatus = 'available' | 'reserved' | 'sold_out' | 'no_sizes' | 'archived';

export const ADMIN_PRODUCT_STATUS_LABELS: Readonly<Record<AdminProductStatus, string>> = {
  available: 'Disponible',
  reserved: 'Reservada',
  sold_out: 'Agotada',
  no_sizes: 'Sin tallas',
  archived: 'Archivada',
};

export type ProductListFilter = 'for_sale' | 'sold_out' | 'archived';

export interface AdminProductSummary {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly status: AdminProductStatus;
  readonly photoUrl: string | null;
  readonly stockUnits: number;
  readonly availableUnits: number;
}

export interface AdminVariant {
  readonly id: number;
  readonly sizeId: number;
  readonly sizeLabel: string;
  readonly sizeSortOrder: number;
  readonly neckCm: number | null;
  readonly chestCm: number | null;
  readonly backLengthCm: number | null;
  readonly toleranceCm: number | null;
  readonly stock: number;
  readonly availableStock: number;
  readonly hasOrders: boolean;
}

export interface AdminPhoto {
  readonly id: number;
  readonly url: string;
  readonly storagePath: string;
  readonly alt: string;
  readonly sortOrder: number;
}

export interface AdminProduct {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly petTypeId: number;
  readonly categoryId: number;
  readonly price: number;
  readonly isActive: boolean;
  readonly variants: readonly AdminVariant[];
  /** Ordered by position. The first one is the cover used in link previews */
  readonly photos: readonly AdminPhoto[];
}

export interface LookupOption {
  readonly id: number;
  readonly name: string;
  readonly active: boolean;
}

/**
 * @description Units held by orders that are paying or waiting for proof validation
 */
export function heldUnits(variant: AdminVariant): number {
  return variant.stock - variant.availableStock;
}
