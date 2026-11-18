import { formatPrice } from '@shared/pipes/price';
import { AdminOrder, PickupInfo, wasProofRejected } from './admin-order';
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

/**
 * @description "Listo para recoger" message. Empty pickup settings are left out
 */
export function readyForPickupMessage(order: AdminOrder, pickup: PickupInfo): string {
  const fee = order.pickupFee > 0 ? `${formatPrice(order.pickupFee)} al recoger` : 'gratis';

  return [
    `¡Hola ${firstName(order.customerName)}! Tu pedido ${order.code} ya está listo para recoger.`,
    pickup.address && `📍 ${pickup.address}`,
    pickup.hours && `🕒 ${pickup.hours}`,
    `Recojo: ${fee}`,
    pickup.notice,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @description "Guía de envío" message. The owner attaches the receipt photo by hand in the chat
 */
export function shippingReceiptMessage(order: AdminOrder): string {
  const payment = order.shippingPaidByStore
    ? 'El envío ya está pagado por CutePet.'
    : 'Recuerda que el envío se paga al recoger en la terminal.';

  return [
    `¡Hola ${firstName(order.customerName)}! Tu pedido ${order.code} ya fue enviado por flota a ${order.destinationCity ?? ''}. Te mando la foto de la guía.`,
    payment,
  ].join('\n');
}

/**
 * @description "Comprobante rechazado" message with the reason the owner wrote
 */
export function proofRejectedMessage(order: AdminOrder): string {
  const reason = sentenceMiddle((order.cancelReason ?? '').trim().replace(/\.+$/, ''));

  return `Hola ${firstName(order.customerName)}, revisamos el comprobante de tu pedido ${order.code} y no pudimos confirmar el pago: ${reason}. ¿Nos ayudas a revisarlo? Si ya hiciste la transferencia, envíanos la captura por aquí y lo vemos juntos.`;
}

/**
 * @description "El monto no coincide" reads "el monto no coincide" after a colon. Acronyms like "QR" stay as they are
 */
function sentenceMiddle(text: string): string {
  return /^\p{Lu}\p{Ll}/u.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

export interface CustomerMessage {
  readonly label: string;
  readonly text: string;
}

/**
 * @description The WhatsApp messages that fit the order right now. The shipping receipt one waits until the receipt is attached
 */
export function messagesFor(order: AdminOrder, pickup: PickupInfo): CustomerMessage[] {
  switch (order.status) {
    case 'confirmed':
      return [{ label: 'Avisar: pago confirmado', text: confirmedMessage(order) }];
    case 'ready_for_pickup':
      return [{ label: 'Avisar: listo para recoger', text: readyForPickupMessage(order, pickup) }];
    case 'shipped':
      return order.shippingReceiptPath
        ? [{ label: 'Avisar: guía de envío', text: shippingReceiptMessage(order) }]
        : [];
    case 'cancelled':
      return wasProofRejected(order)
        ? [{ label: 'Avisar: comprobante rechazado', text: proofRejectedMessage(order) }]
        : [];
    default:
      return [];
  }
}
