import { CheckoutView } from './checkout-order';

export interface CheckoutNotice {
  readonly icon: string;
  readonly message: string;
  readonly actionLabel: string;
  readonly actionLink: string;
}

const NO_ORDER: CheckoutNotice = {
  icon: 'receipt_long',
  message: 'No tienes un pago pendiente.',
  actionLabel: 'Ir al carrito',
  actionLink: '/carrito',
};

const NOTICES: Readonly<Record<Exclude<CheckoutView, 'pay'>, CheckoutNotice>> = {
  expired: {
    icon: 'timer_off',
    message:
      'Tu reserva venció y tus prendas quedaron libres. Puedes volver a intentarlo desde tu carrito.',
    actionLabel: 'Volver al carrito',
    actionLink: '/carrito',
  },
  proof_received: {
    icon: 'check_circle',
    message: 'Recibimos tu comprobante 🐾 Te escribiremos por WhatsApp cuando confirmemos tu pago.',
    actionLabel: 'Seguir viendo prendas',
    actionLink: '/catalogo',
  },
  cancelled: {
    icon: 'cancel',
    message: 'Este pedido fue cancelado.',
    actionLabel: 'Volver al carrito',
    actionLink: '/carrito',
  },
};

/**
 * @description What the payment screen says when there is nothing to pay. Null while paying
 */
export function checkoutNotice(view: CheckoutView | null): CheckoutNotice | null {
  if (view === 'pay') {
    return null;
  }
  return view ? NOTICES[view] : NO_ORDER;
}
