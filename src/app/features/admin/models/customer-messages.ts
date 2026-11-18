import { formatPrice } from '@shared/pipes/price';
import { DeliveryMethod } from './quick-sale';

export interface ConfirmedOrder {
  readonly customerName: string;
  readonly code: string;
  readonly itemsTotal: number;
  readonly deliveryMethod: DeliveryMethod;
}

/**
 * @description "Confirmado" message to the customer. Draft text, reviewed by the owner (docs/spec.md, step 5)
 */
export function confirmedMessage(order: ConfirmedOrder): string {
  const next =
    order.deliveryMethod === 'pickup_point'
      ? 'Te avisamos cuando esté listo para recoger.'
      : 'Te enviaremos la guía cuando lo despachemos.';

  return [
    `¡Hola ${firstName(order.customerName)}! Recibimos tu pago del pedido ${order.code} por ${formatPrice(order.itemsTotal)}. ¡Gracias por tu compra! 🐾`,
    next,
  ].join('\n');
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}
