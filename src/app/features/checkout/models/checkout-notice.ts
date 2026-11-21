import { CheckoutView } from './checkout-order';

export interface CheckoutNotice {
  readonly icon: string;
  readonly message: string;
}

const NO_ORDER: CheckoutNotice = {
  icon: 'receipt_long',
  message: 'No tienes un pago pendiente.',
};

const CANCELLED: CheckoutNotice = {
  icon: 'cancel',
  message: 'Este pedido fue cancelado.',
};

/**
 * @description What the payment screen says when the order is missing or cancelled. Null for every
 * other view, which has its own screen
 */
export function checkoutNotice(view: CheckoutView | null): CheckoutNotice | null {
  if (view === null) {
    return NO_ORDER;
  }
  return view === 'cancelled' ? CANCELLED : null;
}
