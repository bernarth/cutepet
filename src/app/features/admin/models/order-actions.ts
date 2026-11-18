import { ORDER_STATUS_LABELS } from '@core/orders/order-status';
import { AdminOrder } from './admin-order';

export type OrderAction = 'confirm' | 'reject' | 'advance' | 'revert' | 'cancel' | 'restore';

/**
 * @description Buttons the panel shows for an order. The database checks every rule again
 * @returns In display order, the main action first
 */
export function availableActions(order: AdminOrder): OrderAction[] {
  switch (order.status) {
    case 'pending_payment':
      return ['cancel'];
    case 'proof_uploaded':
      return ['confirm', 'reject', 'revert'];
    case 'confirmed':
      return order.channel === 'web' ? ['advance', 'revert', 'cancel'] : ['advance', 'cancel'];
    case 'ready_for_pickup':
    case 'shipped':
      return ['advance', 'revert', 'cancel'];
    case 'delivered':
      return ['revert'];
    case 'cancelled':
      return ['restore'];
  }
}

export function actionLabel(action: OrderAction, order: AdminOrder): string {
  switch (action) {
    case 'confirm':
      return 'Confirmar pago';
    case 'reject':
      return 'Rechazar comprobante';
    case 'advance':
      return advanceLabel(order);
    case 'revert':
      return `Volver a "${ORDER_STATUS_LABELS[previousStatus(order)]}"`;
    case 'cancel':
      return 'Cancelar pedido';
    case 'restore':
      return 'Restaurar pedido';
  }
}

function advanceLabel(order: AdminOrder): string {
  if (order.status === 'confirmed') {
    return order.deliveryMethod === 'pickup_point' ? 'Marcar listo para recoger' : 'Marcar enviado';
  }
  return 'Marcar entregado';
}

/**
 * @description Same fixed backward map as the database (docs/spec.md, "Revert")
 */
export function previousStatus(order: AdminOrder): AdminOrder['status'] {
  switch (order.status) {
    case 'proof_uploaded':
      return 'pending_payment';
    case 'confirmed':
      return 'proof_uploaded';
    case 'ready_for_pickup':
    case 'shipped':
      return 'confirmed';
    case 'delivered':
      return order.deliveryMethod === 'pickup_point' ? 'ready_for_pickup' : 'shipped';
    default:
      return order.status;
  }
}
