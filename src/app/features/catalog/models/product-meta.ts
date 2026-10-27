import { ProductDetail } from './product';

const bolivianos = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' });

/** Link preview text. WhatsApp ignores product:price, so the price goes here */
export function productMetaDescription(product: ProductDetail): string {
  if (product.status === 'sold_out') {
    return `Ya vendida. Pide una parecida a tu medida. ${product.description}`.trim();
  }
  const labels = product.variants
    .filter((variant) => variant.availability === 'available')
    .map((variant) => variant.sizeLabel);
  const sizes = labels.length === 1 ? `Talla ${labels[0]}` : `Tallas ${joinSpanish(labels)}`;
  const parts = [bolivianos.format(product.price), labels.length ? sizes : 'Reservada'];
  return `${parts.join(' · ')}. ${product.description}`.trim();
}

function joinSpanish(items: readonly string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} y ${items.at(-1)}` : items.join('');
}
