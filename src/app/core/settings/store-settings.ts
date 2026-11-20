import { PickupRule } from '@core/cart/cart-summary';
import { Tables } from '@core/supabase/database.types';

export const STORE_TIME_ZONE = 'America/La_Paz';

/** The public settings every page may read. The admin settings form reads the whole row on its own */
export const STORE_SETTINGS_COLUMNS =
  'qr_checkout_enabled, qr_disabled_message, qr_image_path, qr_expires_on, validation_hours, store_whatsapp, pickup_address, pickup_hours, pickup_notice, pickup_fee, free_pickup_min_items, shipping_promo_enabled, shipping_promo_min_items, shipping_promo_min_total, size_tolerance_cm' as const;

type StoreSettingsRow = Pick<
  Tables<'settings'>,
  | 'qr_checkout_enabled'
  | 'qr_disabled_message'
  | 'qr_image_path'
  | 'qr_expires_on'
  | 'validation_hours'
  | 'store_whatsapp'
  | 'pickup_address'
  | 'pickup_hours'
  | 'pickup_notice'
  | 'pickup_fee'
  | 'free_pickup_min_items'
  | 'shipping_promo_enabled'
  | 'shipping_promo_min_items'
  | 'shipping_promo_min_total'
  | 'size_tolerance_cm'
>;

export interface PickupInfo {
  readonly address: string;
  readonly hours: string;
  readonly notice: string;
}

/** CutePet pays the bus parcel fee when the order reaches either amount */
export interface ShippingPromo {
  readonly minItems: number | null;
  readonly minTotal: number | null;
}

export interface StoreSettings {
  readonly qrCheckoutAvailable: boolean;
  readonly qrDisabledMessage: string;
  readonly qrImagePath: string | null;
  readonly validationHours: string;
  readonly storeWhatsapp: string | null;
  readonly pickup: PickupInfo;
  readonly pickupRule: PickupRule;
  readonly shippingPromo: ShippingPromo | null;
  readonly sizeToleranceCm: number;
}

const storeDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: STORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * @description yyyy-mm-dd of the given moment in La Paz, whatever the device time zone
 */
export function storeDate(moment: Date): string {
  return storeDateFormat.format(moment);
}

/**
 * @param today yyyy-mm-dd in the store time zone. The QR still works on its expiry date
 */
export function toStoreSettings(row: StoreSettingsRow, today: string): StoreSettings {
  const qrIsCurrent = row.qr_expires_on === null || row.qr_expires_on >= today;

  return {
    qrCheckoutAvailable: row.qr_checkout_enabled && row.qr_image_path !== null && qrIsCurrent,
    qrDisabledMessage: row.qr_disabled_message,
    qrImagePath: row.qr_image_path,
    validationHours: row.validation_hours,
    storeWhatsapp: row.store_whatsapp,
    pickup: { address: row.pickup_address, hours: row.pickup_hours, notice: row.pickup_notice },
    pickupRule: { fee: row.pickup_fee, freeFromUnits: row.free_pickup_min_items },
    shippingPromo: row.shipping_promo_enabled
      ? { minItems: row.shipping_promo_min_items, minTotal: row.shipping_promo_min_total }
      : null,
    sizeToleranceCm: row.size_tolerance_cm,
  };
}
