import {
  applyWhen,
  max,
  maxLength,
  min,
  pattern,
  required,
  schema,
  validate,
} from '@angular/forms/signals';

import { maxDecimals, requiredText } from '@shared/forms/form-rules';
import { MOBILE_PATTERN } from '@core/orders/customer-details';

export const QR_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const QR_IMAGE_TYPES: readonly string[] = ['image/png', 'image/jpeg'];

export interface SettingsFormModel {
  qrCheckoutEnabled: boolean;
  qrDisabledMessage: string;
  /** Storage path of the saved QR, or a local preview URL until the new image is saved */
  qrImage: string;
  /** yyyy-mm-dd, empty when not set */
  qrExpiresOn: string;
  reservationMinutes: number | null;
  validationHours: string;
  storeWhatsapp: string;
  pickupAddress: string;
  pickupHours: string;
  pickupNotice: string;
  pickupFee: number | null;
  freePickupMinItems: number | null;
  shippingPromoEnabled: boolean;
  shippingPromoMinItems: number | null;
  shippingPromoMinTotal: number | null;
  sizeToleranceCm: number | null;
}

/** Shown only until the saved settings load */
export const EMPTY_SETTINGS: SettingsFormModel = {
  qrCheckoutEnabled: false,
  qrDisabledMessage: '',
  qrImage: '',
  qrExpiresOn: '',
  reservationMinutes: null,
  validationHours: '',
  storeWhatsapp: '',
  pickupAddress: '',
  pickupHours: '',
  pickupNotice: '',
  pickupFee: null,
  freePickupMinItems: null,
  shippingPromoEnabled: false,
  shippingPromoMinItems: null,
  shippingPromoMinTotal: null,
  sizeToleranceCm: null,
};

export function settingsSchema(today: string) {
  return schema<SettingsFormModel>((path) => {
    requiredText(path.qrDisabledMessage, 'Escribe el mensaje');
    maxLength(path.qrDisabledMessage, 300, { message: 'Máximo 300 caracteres' });
    applyWhen(
      path,
      ({ valueOf }) => valueOf(path.qrCheckoutEnabled),
      (qr) => {
        required(qr.qrImage, { message: 'Sube la imagen del QR' });
        required(qr.qrExpiresOn, { message: 'Elige hasta cuándo vale el QR' });
        requiredText(qr.validationHours, 'Escribe el horario en que validas los pagos');
      },
    );
    validate(path.qrExpiresOn, ({ value }) =>
      value() !== '' && value() < today
        ? { kind: 'past', message: 'Esa fecha ya pasó' }
        : undefined,
    );
    maxLength(path.validationHours, 200, { message: 'Máximo 200 caracteres' });

    required(path.reservationMinutes, { message: 'Escribe los minutos' });
    min(path.reservationMinutes, 5, { message: 'Mínimo 5 minutos' });
    max(path.reservationMinutes, 60, { message: 'Máximo 60 minutos' });
    maxDecimals(path.reservationMinutes, 0);

    pattern(path.storeWhatsapp, MOBILE_PATTERN, {
      message: 'Usa 8 dígitos que empiecen con 6 o 7, sin 591',
    });

    maxLength(path.pickupAddress, 300, { message: 'Máximo 300 caracteres' });
    maxLength(path.pickupHours, 200, { message: 'Máximo 200 caracteres' });
    maxLength(path.pickupNotice, 300, { message: 'Máximo 300 caracteres' });
    required(path.pickupFee, { message: 'Escribe el costo del recojo' });
    min(path.pickupFee, 0, { message: 'No puede ser negativo' });
    max(path.pickupFee, 100, { message: 'Máximo Bs 100' });
    maxDecimals(path.pickupFee, 2);
    required(path.freePickupMinItems, { message: 'Escribe la cantidad de prendas' });
    min(path.freePickupMinItems, 1, { message: 'Mínimo 1 prenda' });
    maxDecimals(path.freePickupMinItems, 0);

    validate(path.shippingPromoMinItems, ({ valueOf }) =>
      valueOf(path.shippingPromoEnabled) &&
      valueOf(path.shippingPromoMinItems) === null &&
      valueOf(path.shippingPromoMinTotal) === null
        ? { kind: 'promoRule', message: 'Escribe la cantidad de prendas o el monto mínimo' }
        : undefined,
    );
    min(path.shippingPromoMinItems, 1, { message: 'Mínimo 1 prenda' });
    maxDecimals(path.shippingPromoMinItems, 0);
    min(path.shippingPromoMinTotal, 0.01, { message: 'Debe ser mayor a 0' });
    maxDecimals(path.shippingPromoMinTotal, 2);

    required(path.sizeToleranceCm, { message: 'Escribe la tolerancia' });
    min(path.sizeToleranceCm, 0, { message: 'No puede ser negativa' });
    max(path.sizeToleranceCm, 10, { message: 'Máximo 10 cm' });
    maxDecimals(path.sizeToleranceCm, 1);
  });
}
