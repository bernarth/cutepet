import { ORDER_STATUS_LABELS } from '@core/orders/order-status';
import { formatPrice } from '@shared/pipes/price';
import { AdminOrder } from './admin-order';
import { OrderAction, actionLabel } from './order-actions';

export interface ActionDialogText {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  /** null when the action needs no reason, only a confirmation */
  readonly reasonSuggestions: readonly string[] | null;
}

/**
 * @description What the confirmation dialog of each action says. Cancel, reject, revert and restore ask for a reason
 */
export function actionDialogText(action: OrderAction, order: AdminOrder): ActionDialogText {
  const title = actionLabel(action, order);

  switch (action) {
    case 'confirm':
      return {
        title,
        message: `Revisa en la app del banco que llegó ${formatPrice(order.itemsTotal)} con la glosa ${order.code}. Las prendas quedan vendidas.`,
        confirmLabel: 'Confirmar pago',
        reasonSuggestions: null,
      };
    case 'advance':
      return {
        title,
        message: advanceMessage(order),
        confirmLabel: title,
        reasonSuggestions: null,
      };
    case 'reject':
      return {
        title,
        message:
          'El pedido se cancela y las prendas quedan libres. Si fue un error, puedes restaurarlo.',
        confirmLabel: 'Rechazar',
        reasonSuggestions: ['El monto no coincide', 'El comprobante no se lee', 'El pago no llegó'],
      };
    case 'cancel':
      return {
        title,
        message:
          'Las prendas vuelven a estar disponibles. El pedido no se borra y se puede restaurar.',
        confirmLabel: 'Cancelar pedido',
        reasonSuggestions: ['Ya no lo quiere', 'Pedido duplicado'],
      };
    case 'revert':
      return {
        title,
        message: 'El pedido vuelve al paso anterior.',
        confirmLabel: 'Volver atrás',
        reasonSuggestions: ['Lo marqué por error'],
      };
    case 'restore':
      return {
        title,
        message: `Vuelve a "${ORDER_STATUS_LABELS[order.statusBeforeCancel ?? 'pending_payment']}" y toma otra vez las prendas. Si alguna ya no está libre, no se puede restaurar.`,
        confirmLabel: 'Restaurar',
        reasonSuggestions: ['Lo cancelé por error'],
      };
  }
}

function advanceMessage(order: AdminOrder): string {
  if (
    order.status === 'confirmed' &&
    order.deliveryMethod === 'bus_parcel' &&
    !order.shippingReceiptPath
  ) {
    return 'Aún no adjuntaste la guía de envío. Puedes marcarlo como enviado igual y adjuntarla después.';
  }
  return order.status === 'confirmed'
    ? 'Después puedes avisar por WhatsApp.'
    : 'El pedido queda como entregado.';
}
