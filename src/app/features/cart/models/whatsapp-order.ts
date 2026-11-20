import { itemsTotal } from '@core/cart/cart-summary';
import { DeliveryMethod } from '@core/orders/customer-details';
import { formatPrice } from '@shared/pipes/price';

import { ItemMeasurements } from './cart-item';
import { unitsText } from './delivery';

export interface WhatsappOrderItem {
  readonly productName: string;
  readonly sizeLabel: string;
  readonly measurements: ItemMeasurements;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly productUrl: string;
}

export interface WhatsappOrder {
  readonly items: readonly WhatsappOrderItem[];
  readonly total: number;
  readonly units: number;
  readonly delivery: DeliveryMethod;
  readonly pickupFee: number;
}

const centimeters = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 });

export function whatsappOrderMessage(order: WhatsappOrder): string {
  return [
    '¡Hola CutePet! Quiero hacer este pedido desde la web:',
    '',
    ...order.items.map(itemText),
    '',
    `Total: ${formatPrice(order.total)} (${unitsText(order.units)})`,
    `Entrega: ${deliveryText(order.delivery, order.pickupFee)}`,
    '',
    '¿Me confirmas para hacer el pago?',
  ].join('\n');
}

function itemText(item: WhatsappOrderItem): string {
  const quantity = item.quantity > 1 ? `${item.quantity} x ` : '';
  const parts = [
    `${quantity}${item.productName}`,
    `Talla ${item.sizeLabel}`,
    measurementsText(item.measurements),
    formatPrice(itemsTotal([item])),
    item.productUrl,
  ];

  return `• ${parts.filter(Boolean).join(' · ')}`;
}

function measurementsText({ neck, chest, backLength }: ItemMeasurements): string {
  const parts = [
    neck === null ? '' : `cuello ${centimeters.format(neck)}`,
    chest === null ? '' : `pecho ${centimeters.format(chest)}`,
    backLength === null ? '' : `largo ${centimeters.format(backLength)}`,
  ].filter(Boolean);

  return parts.length ? `${parts.join(', ')} cm` : '';
}

function deliveryText(delivery: DeliveryMethod, pickupFee: number): string {
  if (delivery === 'bus_parcel') {
    return 'envío por flota a otro departamento (el envío lo pago en la terminal)';
  }

  return `recojo en La Paz (${pickupFee === 0 ? 'gratis' : `${formatPrice(pickupFee)} al recoger`})`;
}
