import { DeliveryMethod } from '@core/orders/customer-details';
import { Database } from '@core/supabase/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];

/**
 * @description Row of `my_checkout_order`. The generated types mark every column as set, but
 * cancel_reason, destination_city and seconds_left can be null, so this shape says so
 */
export interface CheckoutOrderRow {
  readonly id: string;
  readonly code: string;
  readonly status: OrderStatus;
  readonly cancel_reason: string | null;
  readonly needs_attention: boolean;
  readonly delivery_method: DeliveryMethod;
  readonly destination_city: string | null;
  readonly items_total: number;
  readonly pickup_fee: number;
  readonly shipping_paid_by_store: boolean;
  readonly seconds_left: number | null;
}

export interface CheckoutOrder {
  readonly id: string;
  readonly code: string;
  readonly status: OrderStatus;
  readonly cancelReason: string | null;
  readonly needsAttention: boolean;
  readonly deliveryMethod: DeliveryMethod;
  readonly destinationCity: string | null;
  readonly itemsTotal: number;
  readonly pickupFee: number;
  readonly shippingPaidByStore: boolean;
  /** Seconds the reservation had left when the server answered. Null when the order is not pending */
  readonly secondsLeft: number | null;
}

export function toCheckoutOrder(row: CheckoutOrderRow): CheckoutOrder {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    cancelReason: row.cancel_reason,
    needsAttention: row.needs_attention,
    deliveryMethod: row.delivery_method,
    destinationCity: row.destination_city,
    itemsTotal: Number(row.items_total),
    pickupFee: Number(row.pickup_fee),
    shippingPaidByStore: row.shipping_paid_by_store,
    secondsLeft: row.seconds_left,
  };
}

/**
 * - pay: reserved and still on time
 * - expired: the reservation ran out. Late proofs are still accepted
 * - proof_received: the proof is uploaded, or the order already moved on
 * - cancelled: cancelled for any other reason
 */
export type CheckoutView = 'pay' | 'expired' | 'proof_received' | 'cancelled';

/**
 * @param secondsLeft What the countdown shows now, so the screen changes at 0 without waiting for the server
 */
export function checkoutView(order: CheckoutOrder, secondsLeft: number): CheckoutView {
  if (order.status === 'pending_payment') {
    return secondsLeft > 0 ? 'pay' : 'expired';
  }
  if (order.status === 'cancelled') {
    return order.cancelReason === 'reservation_expired' ? 'expired' : 'cancelled';
  }
  return 'proof_received';
}
