import { Database } from '@core/supabase/database.types';

export type OrderStatus = Database['public']['Enums']['order_status'];

/**
 * @description The only place with the Spanish name of each order status (docs/spec.md, "Order statuses")
 */
export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  pending_payment: 'Pendiente de pago',
  proof_uploaded: 'Comprobante subido',
  confirmed: 'Confirmado',
  ready_for_pickup: 'Listo para recoger',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};
