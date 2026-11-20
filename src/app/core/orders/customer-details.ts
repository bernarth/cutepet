import { applyWhen, maxLength, pattern, schema, validate } from '@angular/forms/signals';

import { Database } from '@core/supabase/database.types';
import { requiredText } from '@shared/forms/form-rules';

export type DeliveryMethod = Database['public']['Enums']['delivery_method'];

export const DELIVERY_LABELS: Readonly<Record<DeliveryMethod, string>> = {
  pickup_point: 'Recojo en La Paz',
  bus_parcel: 'Envío por flota',
};

/** Bolivian mobile: 8 digits starting with 6 or 7 */
export const MOBILE_PATTERN = /^[67]\d{7}$/;

/**
 * @description Who receives the order and how. Shared by the quick sale and QR checkout
 */
export interface CustomerDetails {
  customerName: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
  destinationCity: string;
  recipientName: string;
  recipientIdNumber: string;
}

export const EMPTY_CUSTOMER_DETAILS: CustomerDetails = {
  customerName: '',
  customerPhone: '',
  deliveryMethod: 'pickup_point',
  destinationCity: '',
  recipientName: '',
  recipientIdNumber: '',
};

/** Same limits as the orders table */
export const customerDetailsSchema = schema<CustomerDetails>((path) => {
  requiredText(path.customerName, 'Escribe el nombre');
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

/** Arguments shared by the reserve_order and create_quick_sale RPCs */
export interface CustomerDetailsRequest {
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
export function toCustomerDetailsRequest(details: CustomerDetails): CustomerDetailsRequest {
  const customerName = details.customerName.trim();
  const request: CustomerDetailsRequest = {
    customer_name: customerName,
    customer_phone: details.customerPhone.trim(),
    delivery_method: details.deliveryMethod,
  };

  if (details.deliveryMethod === 'pickup_point') {
    return request;
  }

  return {
    ...request,
    destination_city: details.destinationCity.trim(),
    recipient_name: details.recipientName.trim() || customerName,
    ...(details.recipientIdNumber.trim() && {
      recipient_id_number: details.recipientIdNumber.trim(),
    }),
  };
}
