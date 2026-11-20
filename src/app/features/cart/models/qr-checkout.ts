import { ShippingPromo } from '@core/settings/store-settings';
import { AppError } from '@shared/data-access/supabase-result';
import { formatPrice } from '@shared/pipes/price';
import { unitsText } from './delivery';

export interface ShippingPromoNotice {
  readonly paidByStore: boolean;
  readonly text: string;
}

/**
 * @description Same rule as the database: CutePet pays the bus parcel when the order reaches
 * the items or the total in settings. Null when the promotion is off or has no threshold
 */
export function shippingPromoNotice(
  promo: ShippingPromo | null,
  units: number,
  total: number,
): ShippingPromoNotice | null {
  if (!promo) {
    return null;
  }

  const thresholds = [
    promo.minItems === null ? null : unitsText(promo.minItems),
    promo.minTotal === null ? null : formatPrice(promo.minTotal),
  ].filter((threshold) => threshold !== null);

  if (thresholds.length === 0) {
    return null;
  }

  const paidByStore =
    (promo.minItems !== null && units >= promo.minItems) ||
    (promo.minTotal !== null && total >= promo.minTotal);

  return {
    paidByStore,
    text: paidByStore
      ? '¡Tu envío por flota lo paga CutePet!'
      : `CutePet paga tu envío por flota desde ${thresholds.join(' o ')}.`,
  };
}

/**
 * - items_changed: some piece was sold or is no longer on sale. The cart check removes it and says which
 * - reserved: someone else is paying for a piece right now
 * - qr_disabled: QR checkout was turned off meanwhile
 * - captcha: the Turnstile check failed and must be done again
 */
export type ReserveFailureKind = 'items_changed' | 'reserved' | 'qr_disabled' | 'captcha' | 'other';

export interface ReserveFailure {
  readonly kind: ReserveFailureKind;
  readonly message: string;
}

const MESSAGES: Readonly<Record<ReserveFailureKind, string>> = {
  items_changed: 'Esta prenda ya fue vendida. La quitamos de tu carrito.',
  reserved: 'Alguien está pagando esta prenda, vuelve a intentarlo en unos minutos.',
  qr_disabled: 'El pago con QR ya no está disponible.',
  captcha: 'No pudimos verificar tu conexión. Intenta de nuevo.',
  other: 'No pudimos reservar tu pedido. Intenta de nuevo en unos minutos.',
};

export function reserveFailure(error: unknown): ReserveFailure {
  const kind = failureKind(error);
  return { kind, message: MESSAGES[kind] };
}

function failureKind(error: unknown): ReserveFailureKind {
  if (!(error instanceof Error)) {
    return 'other';
  }
  if (error.message.toLowerCase().includes('captcha')) {
    return 'captcha';
  }

  switch (error.message) {
    case 'VARIANT_NOT_FOUND':
      return 'items_changed';
    case 'QR_CHECKOUT_DISABLED':
      return 'qr_disabled';
    case 'ITEMS_UNAVAILABLE':
      return hasSoldItems(error) ? 'items_changed' : 'reserved';
    default:
      return 'other';
  }
}

function hasSoldItems(error: Error): boolean {
  if (!(error instanceof AppError) || !error.detail) {
    return false;
  }

  try {
    const detail: { sold?: unknown } = JSON.parse(error.detail);
    return Array.isArray(detail.sold) && detail.sold.length > 0;
  } catch {
    return false;
  }
}
