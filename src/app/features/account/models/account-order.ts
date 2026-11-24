import { OrderStatus } from '@core/orders/order-status';

export interface AccountOrderRow {
  readonly code: string;
  readonly status: OrderStatus;
  readonly cancel_reason: string | null;
  readonly items_total: number;
  readonly created_at: string;
  readonly order_items: readonly { readonly product_name: string; readonly quantity: number }[];
}

export interface AccountOrder {
  readonly code: string;
  readonly status: OrderStatus;
  readonly itemsTotal: number;
  readonly createdAt: string;
  readonly pieces: readonly string[];
  /** What the payment screen still lets the customer do. Null when nothing is left to pay there */
  readonly paymentLabel: string | null;
}

export function toAccountOrder(row: AccountOrderRow): AccountOrder {
  return {
    code: row.code,
    status: row.status,
    itemsTotal: Number(row.items_total),
    createdAt: row.created_at,
    pieces: row.order_items.map(({ product_name, quantity }) =>
      quantity > 1 ? `${quantity} x ${product_name}` : product_name,
    ),
    paymentLabel: paymentLabel(row),
  };
}

function paymentLabel({ status, cancel_reason }: AccountOrderRow): string | null {
  if (status === 'pending_payment') {
    return 'Continuar pago';
  }
  return status === 'cancelled' && cancel_reason === 'reservation_expired'
    ? 'Ya pagué, subir comprobante'
    : null;
}
