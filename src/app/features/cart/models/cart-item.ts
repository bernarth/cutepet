import { CartLine } from '@core/cart/cart-line';

export const RESERVED_NOTE =
  'Alguien está comprando esta prenda. Si no completa su compra, volverá a estar disponible en unos minutos.';

export interface CartPhoto {
  readonly url: string;
  readonly alt: string;
}

export interface ItemMeasurements {
  readonly neck: number | null;
  readonly chest: number | null;
  readonly backLength: number | null;
}

/**
 * @description Fresh data of a piece in the cart. The price is never taken from the stored cart
 */
export interface CartVariant {
  readonly id: number;
  readonly stock: number;
  readonly availableStock: number;
  readonly productName: string;
  readonly slug: string;
  readonly unitPrice: number;
  readonly photo: CartPhoto | null;
  readonly measurements: ItemMeasurements;
}

export interface CartItem {
  readonly line: CartLine;
  readonly variant: CartVariant;
  readonly isReserved: boolean;
}

export interface QuantityLimit {
  readonly variantId: number;
  readonly maxQuantity: number;
}

export interface CartReview {
  readonly soldIds: readonly number[];
  readonly limits: readonly QuantityLimit[];
  readonly notices: readonly string[];
}

/**
 * @description Compares the stored cart with the database. A piece that is no longer visible or has
 * no stock left was sold. A reserved piece stays in the cart. A quantity above what is left is lowered
 */
export function reviewCart(
  lines: readonly CartLine[],
  variants: ReadonlyMap<number, CartVariant>,
): CartReview {
  const sold = lines.filter((line) => (variants.get(line.variantId)?.stock ?? 0) <= 0);
  const limited = lines.flatMap((line) => {
    const available = variants.get(line.variantId)?.availableStock ?? 0;
    return available > 0 && available < line.quantity ? [{ line, available }] : [];
  });

  return {
    soldIds: sold.map((line) => line.variantId),
    limits: limited.map(({ line, available }) => ({
      variantId: line.variantId,
      maxQuantity: available,
    })),
    notices: [
      ...sold.map((line) => `Esta prenda ya fue vendida: ${pieceName(line)}`),
      ...limited.map(({ line, available }) => `Solo queda ${available} de ${pieceName(line)}`),
    ],
  };
}

export function toCartItems(
  lines: readonly CartLine[],
  variants: ReadonlyMap<number, CartVariant>,
): CartItem[] {
  return lines.flatMap((line) => {
    const variant = variants.get(line.variantId);
    return variant && variant.stock > 0
      ? [{ line, variant, isReserved: variant.availableStock <= 0 }]
      : [];
  });
}

function pieceName(line: CartLine): string {
  return `${line.productName} (Talla ${line.sizeLabel})`;
}
