import { Tables, TablesUpdate } from '@core/supabase/database.types';
import { SettingsFormModel } from './settings-form';

const DAY_MS = 24 * 60 * 60 * 1000;
const WARNING_DAYS = 7;

export function toSettingsForm(row: Tables<'settings'>): SettingsFormModel {
  return {
    qrCheckoutEnabled: row.qr_checkout_enabled,
    qrDisabledMessage: row.qr_disabled_message,
    qrImage: row.qr_image_path ?? '',
    qrExpiresOn: row.qr_expires_on ?? '',
    reservationMinutes: row.reservation_minutes,
    validationHours: row.validation_hours,
    storeWhatsapp: localMobile(row.store_whatsapp ?? ''),
    pickupAddress: row.pickup_address,
    pickupHours: row.pickup_hours,
    pickupNotice: row.pickup_notice,
    pickupFee: row.pickup_fee,
    freePickupMinItems: row.free_pickup_min_items,
    shippingPromoEnabled: row.shipping_promo_enabled,
    shippingPromoMinItems: row.shipping_promo_min_items,
    shippingPromoMinTotal: row.shipping_promo_min_total,
    sizeToleranceCm: row.size_tolerance_cm,
  };
}

/**
 * @param qrImagePath The saved storage path, after uploading a new QR if there was one
 */
export function toSettingsUpdate(
  model: SettingsFormModel,
  qrImagePath: string | null,
): TablesUpdate<'settings'> {
  return {
    qr_checkout_enabled: model.qrCheckoutEnabled,
    qr_disabled_message: model.qrDisabledMessage.trim(),
    qr_image_path: qrImagePath,
    qr_expires_on: model.qrExpiresOn || null,
    reservation_minutes: model.reservationMinutes ?? undefined,
    validation_hours: model.validationHours.trim(),
    store_whatsapp: model.storeWhatsapp.trim() || null,
    pickup_address: model.pickupAddress.trim(),
    pickup_hours: model.pickupHours.trim(),
    pickup_notice: model.pickupNotice.trim(),
    pickup_fee: model.pickupFee ?? undefined,
    free_pickup_min_items: model.freePickupMinItems ?? undefined,
    shipping_promo_enabled: model.shippingPromoEnabled,
    shipping_promo_min_items: model.shippingPromoMinItems,
    shipping_promo_min_total: model.shippingPromoMinTotal,
    size_tolerance_cm: model.sizeToleranceCm ?? undefined,
  };
}

/**
 * @description "Vence en 3 días" from 7 days before the expiry date, or null when there is time left
 * @param expiresOn yyyy-mm-dd
 * @param today yyyy-mm-dd in the store's time zone
 */
export function qrExpiryNotice(expiresOn: string, today: string): string | null {
  if (!expiresOn) {
    return null;
  }

  const days = Math.round((Date.parse(expiresOn) - Date.parse(today)) / DAY_MS);

  if (days > WARNING_DAYS) {
    return null;
  }
  if (days < 0) {
    return 'El QR ya venció. Sube uno nuevo.';
  }
  if (days === 0) {
    return 'El QR vence hoy.';
  }
  return `El QR vence en ${days} ${days === 1 ? 'día' : 'días'}.`;
}

/**
 * @description The form asks for the 8 digits only. An older value saved with 591 is shown without it
 */
function localMobile(stored: string): string {
  return stored.length === 11 && stored.startsWith('591') ? stored.slice(3) : stored;
}
