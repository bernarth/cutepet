import { whatsappContactText } from '@core/orders/customer-details';
import { PickupInfo } from '@core/settings/store-settings';
import { formatPrice } from '@shared/pipes/price';

import { CheckoutOrder } from './checkout-order';

export const NEEDS_ATTENTION_MESSAGE =
  'Recibimos tu comprobante 🐾. Una de las prendas ya no estaba disponible, así que te escribiremos por WhatsApp para resolverlo.';

export interface OrderReceived {
  readonly message: string;
  /** The phone the owner will write to, so a typo is easy to notice */
  readonly contact: string | null;
  /** Null when the order needs the owner first, so no delivery promise is made yet */
  readonly delivery: DeliveryDetails | null;
}

export interface DeliveryDetails {
  readonly title: string;
  readonly lines: readonly string[];
}

/**
 * @description What the customer reads once the proof is uploaded or the order moved on
 */
export function orderReceived(order: CheckoutOrder, pickup: PickupInfo): OrderReceived {
  if (order.needsAttention) {
    return { message: NEEDS_ATTENTION_MESSAGE, contact: contactText(order), delivery: null };
  }

  const message =
    order.status === 'proof_uploaded'
      ? 'Recibimos tu comprobante 🐾 Te escribiremos por WhatsApp cuando confirmemos tu pago.'
      : 'Tu pago está confirmado 🐾 ¡Gracias por tu compra!';

  return { message, contact: contactText(order), delivery: deliveryDetails(order, pickup) };
}

function contactText(order: CheckoutOrder): string | null {
  return whatsappContactText(order.customerPhone);
}

function deliveryDetails(order: CheckoutOrder, pickup: PickupInfo): DeliveryDetails {
  if (order.deliveryMethod === 'bus_parcel') {
    const destination = order.destinationCity ? ` a ${order.destinationCity}` : '';
    return {
      title: 'Envío por flota',
      lines: [
        `Enviamos tu pedido por flota${destination}. Te mandaremos la guía de envío por WhatsApp.`,
        order.shippingPaidByStore
          ? 'El envío lo paga CutePet.'
          : 'El envío lo pagas en la terminal al recoger tu encomienda.',
      ],
    };
  }

  const fee =
    order.pickupFee > 0
      ? `Pagas ${formatPrice(order.pickupFee)} al recoger.`
      : 'El recojo es gratis.';
  return {
    title: 'Recojo en La Paz',
    lines: [
      pickup.address && `Dirección: ${pickup.address}`,
      pickup.hours && `Horario: ${pickup.hours}`,
      pickup.notice,
      fee,
    ].filter(Boolean),
  };
}
