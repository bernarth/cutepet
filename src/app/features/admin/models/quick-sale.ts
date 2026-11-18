import { applyWhen, maxLength, minLength, pattern, schema, validate } from '@angular/forms/signals';

import { Database } from '@core/supabase/database.types';
import { requiredText } from './form-rules';

export type DeliveryMethod = Database['public']['Enums']['delivery_method'];

export const DELIVERY_LABELS: Readonly<Record<DeliveryMethod, string>> = {
  pickup_point: 'Recojo en La Paz',
  bus_parcel: 'Envío por flota',
};

/** Bolivian mobile: 8 digits starting with 6 or 7 */
export const MOBILE_PATTERN = /^[67]\d{7}$/;

/**
 * @description One size that can be sold right now
 */
export interface SaleOption {
  readonly variantId: number;
  readonly productName: string;
  readonly sizeLabel: string;
  readonly unitPrice: number;
  readonly available: number;
}

export interface SaleProduct {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly photoUrl: string | null;
  readonly options: readonly SaleOption[];
}

/**
 * @description Name, size and price are kept to show the line even if the item stops being available
 */
export interface SaleLine {
  readonly variantId: number;
  readonly quantity: number;
  readonly productName: string;
  readonly sizeLabel: string;
  readonly unitPrice: number;
}

export interface QuickSaleModel {
  lines: SaleLine[];
  customerName: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
  destinationCity: string;
  recipientName: string;
  recipientIdNumber: string;
}

export const EMPTY_QUICK_SALE: QuickSaleModel = {
  lines: [],
  customerName: '',
  customerPhone: '',
  deliveryMethod: 'pickup_point',
  destinationCity: '',
  recipientName: '',
  recipientIdNumber: '',
};

export const quickSaleSchema = schema<QuickSaleModel>((path) => {
  minLength(path.lines, 1, { message: 'Agrega al menos una prenda' });
  requiredText(path.customerName, 'Escribe el nombre del cliente');
  validate(path.customerName, ({ value }) =>
    value().trim().length === 1 ? { kind: 'minLength', message: 'Mínimo 2 letras' } : undefined,
  );
  maxLength(path.customerName, 80, { message: 'Máximo 80 caracteres' });
  requiredText(path.customerPhone, 'Escribe el celular');
  pattern(path.customerPhone, MOBILE_PATTERN, {
    message: 'Usa 8 dígitos que empiecen con 6 o 7',
  });
  applyWhen(
    path,
    ({ valueOf }) => valueOf(path.deliveryMethod) === 'bus_parcel',
    (busParcel) => requiredText(busParcel.destinationCity, 'Escribe la ciudad de destino'),
  );
  maxLength(path.destinationCity, 80, { message: 'Máximo 80 caracteres' });
  maxLength(path.recipientName, 80, { message: 'Máximo 80 caracteres' });
  maxLength(path.recipientIdNumber, 20, { message: 'Máximo 20 caracteres' });
});

/**
 * @description Adds one unit of a size, never more than what is available
 */
export function addLine(lines: readonly SaleLine[], option: SaleOption): SaleLine[] {
  const current = lines.find((line) => line.variantId === option.variantId);

  if (!current) {
    if (option.available === 0) {
      return [...lines];
    }
    const { variantId, productName, sizeLabel, unitPrice } = option;
    return [...lines, { variantId, productName, sizeLabel, unitPrice, quantity: 1 }];
  }

  return lines.map((line) =>
    line === current ? { ...line, quantity: Math.min(line.quantity + 1, option.available) } : line,
  );
}

/**
 * @description A line that can no longer be sold as it is: the size is gone or has fewer units now
 */
export function isLineAvailable(line: SaleLine, options: ReadonlyMap<number, SaleOption>): boolean {
  const option = options.get(line.variantId);
  return option !== undefined && line.quantity <= option.available;
}

export function removeLine(lines: readonly SaleLine[], variantId: number): SaleLine[] {
  return lines.filter((line) => line.variantId !== variantId);
}

export interface QuickSaleRequest {
  readonly items: { variant_id: number; quantity: number }[];
  readonly customer_name: string;
  readonly customer_phone: string;
  readonly delivery_method: DeliveryMethod;
  readonly destination_city?: string;
  readonly recipient_name?: string;
  readonly recipient_id_number?: string;
}

/**
 * @description The recipient defaults to the customer. Bus parcel fields are sent only for bus parcel orders
 */
export function toQuickSaleRequest(model: QuickSaleModel): QuickSaleRequest {
  const customerName = model.customerName.trim();
  const request: QuickSaleRequest = {
    items: model.lines.map((line) => ({ variant_id: line.variantId, quantity: line.quantity })),
    customer_name: customerName,
    customer_phone: model.customerPhone.trim(),
    delivery_method: model.deliveryMethod,
  };

  if (model.deliveryMethod === 'pickup_point') {
    return request;
  }

  return {
    ...request,
    destination_city: model.destinationCity.trim(),
    recipient_name: model.recipientName.trim() || customerName,
    ...(model.recipientIdNumber.trim() && { recipient_id_number: model.recipientIdNumber.trim() }),
  };
}
