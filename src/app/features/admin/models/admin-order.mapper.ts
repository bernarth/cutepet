import { Tables } from '@core/supabase/database.types';
import { AdminOrder, AdminOrderItem, AdminOrderSummary } from './admin-order';

type OrderRow = Tables<'orders'>;

export type OrderSummaryRow = Pick<
  OrderRow,
  | 'id'
  | 'code'
  | 'status'
  | 'needs_attention'
  | 'channel'
  | 'customer_name'
  | 'customer_phone'
  | 'delivery_method'
  | 'items_total'
  | 'created_at'
> & { readonly order_items: readonly { readonly quantity: number }[] };

interface OrderItemRow {
  readonly quantity: number;
  readonly unit_price: number;
  readonly product_name: string;
  readonly variants: { readonly sizes: { readonly label: string } | null } | null;
}

export type OrderDetailRow = OrderRow & { readonly order_items: readonly OrderItemRow[] };

export function toAdminOrderSummary(row: OrderSummaryRow): AdminOrderSummary {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    needsAttention: row.needs_attention,
    channel: row.channel,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    deliveryMethod: row.delivery_method,
    itemsTotal: row.items_total,
    units: row.order_items.reduce((total, item) => total + item.quantity, 0),
    createdAt: row.created_at,
  };
}

export function toAdminOrder(row: OrderDetailRow): AdminOrder {
  return {
    ...toAdminOrderSummary(row),
    statusBeforeCancel: row.status_before_cancel,
    cancelReason: row.cancel_reason,
    destinationCity: row.destination_city,
    recipientName: row.recipient_name,
    recipientIdNumber: row.recipient_id_number,
    pickupFee: row.pickup_fee,
    shippingPaidByStore: row.shipping_paid_by_store,
    reservedUntil: row.reserved_until,
    paymentProofPath: row.payment_proof_path,
    shippingReceiptPath: row.shipping_receipt_path,
    items: row.order_items.map(toAdminOrderItem),
  };
}

function toAdminOrderItem(row: OrderItemRow): AdminOrderItem {
  return {
    productName: row.product_name,
    sizeLabel: row.variants?.sizes?.label ?? '',
    quantity: row.quantity,
    unitPrice: row.unit_price,
  };
}
