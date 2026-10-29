import { CartVariant } from './cart-item';

interface PhotoRow {
  readonly storage_path: string;
  readonly alt_text: string;
  readonly sort_order: number;
}

export interface CartVariantRow {
  readonly id: number;
  readonly stock: number;
  readonly available_stock: number | null;
  readonly neck_cm: number | null;
  readonly chest_cm: number | null;
  readonly back_length_cm: number | null;
  readonly products: {
    readonly name: string;
    readonly slug: string;
    readonly price: number;
    readonly product_photos: readonly PhotoRow[];
  };
}

export function toCartVariant(
  row: CartVariantRow,
  photoUrl: (storagePath: string) => string,
): CartVariant {
  const [photo] = [...row.products.product_photos].sort((a, b) => a.sort_order - b.sort_order);

  return {
    id: row.id,
    stock: row.stock,
    availableStock: row.available_stock ?? 0,
    productName: row.products.name,
    slug: row.products.slug,
    unitPrice: row.products.price,
    photo: photo ? { url: photoUrl(photo.storage_path), alt: photo.alt_text } : null,
    measurements: { neck: row.neck_cm, chest: row.chest_cm, backLength: row.back_length_cm },
  };
}
