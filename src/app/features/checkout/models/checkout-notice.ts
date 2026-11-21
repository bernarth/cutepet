import { CheckoutView } from './checkout-order';

export interface CheckoutNotice {
  readonly icon: string;
  readonly message: string;
  readonly linkLabel: string;
  readonly link: string;
}

const NO_ORDER: CheckoutNotice = {
  icon: 'receipt_long',
  message: 'No tienes un pago pendiente.',
  linkLabel: 'Ir al carrito',
  link: '/carrito',
};

const CANCELLED: CheckoutNotice = {
  icon: 'cancel',
  message: 'Este pedido fue cancelado.',
  linkLabel: 'Ir al carrito',
  link: '/carrito',
};

const REJECTED: CheckoutNotice = {
  icon: 'info',
  message: 'No pudimos confirmar tu pago. Te escribiremos por WhatsApp.',
  linkLabel: 'Seguir viendo prendas',
  link: '/catalogo',
};

/**
 * @description What the payment screen says when the order is missing or cancelled. Null for every
 * other view, which has its own screen
 */
export function checkoutNotice(view: CheckoutView | null): CheckoutNotice | null {
  switch (view) {
    case null:
      return NO_ORDER;
    case 'cancelled':
      return CANCELLED;
    case 'rejected':
      return REJECTED;
    default:
      return null;
  }
}
