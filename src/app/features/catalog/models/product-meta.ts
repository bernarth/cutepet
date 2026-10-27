import { formatPrice } from '@shared/pipes/price';

import { ProductDetail } from './product';

/** Link preview text. WhatsApp ignores product:price, so the price goes here */
export function productMetaDescription(product: ProductDetail): string {
  const labels = product.variants
    .filter((variant) => !variant.isReserved)
    .map((variant) => variant.sizeLabel);
  const sizes = labels.length === 1 ? `Talla ${labels[0]}` : `Tallas ${joinSpanish(labels)}`;
  const parts = [formatPrice(product.price), labels.length ? sizes : 'Alguien la está comprando'];
  return `${parts.join(' · ')}. ${product.description}`.trim();
}

function joinSpanish(items: readonly string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} y ${items.at(-1)}` : items.join('');
}
