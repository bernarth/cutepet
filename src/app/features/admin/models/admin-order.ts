import { OrderStatus } from '@core/orders/order-status';
import { Database } from '@core/supabase/database.types';
import { DeliveryMethod } from '@core/orders/customer-details';

export type OrderChannel = Database['public']['Enums']['order_channel'];

/** "to_review" is the default view: proofs waiting for the owner, the flagged ones first */
export type OrderListFilter = 'to_review' | 'all' | OrderStatus;

export interface AdminOrderSummary {
  readonly id: string;
  readonly code: string;
  readonly status: OrderStatus;
  readonly needsAttention: boolean;
  readonly channel: OrderChannel;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly deliveryMethod: DeliveryMethod;
  readonly itemsTotal: number;
  readonly units: number;
  readonly createdAt: string;
}

export interface AdminOrderItem {
  readonly productName: string;
  readonly sizeLabel: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface AdminOrder extends AdminOrderSummary {
  readonly statusBeforeCancel: OrderStatus | null;
  readonly cancelReason: string | null;
  readonly destinationCity: string | null;
  readonly recipientName: string | null;
  readonly recipientIdNumber: string | null;
  readonly pickupFee: number;
  readonly shippingPaidByStore: boolean;
  readonly reservedUntil: string | null;
  readonly paymentProofPath: string | null;
  readonly shippingReceiptPath: string | null;
  readonly items: readonly AdminOrderItem[];
}

/**
 * @description A proof rejected by the owner is an order cancelled while its proof was waiting for review
 */
export function wasProofRejected(order: AdminOrder): boolean {
  return order.status === 'cancelled' && order.statusBeforeCancel === 'proof_uploaded';
}
