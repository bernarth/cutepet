import { AdminOrder } from './admin-order';

/**
 * @description Test data only: a confirmed web order for pickup, changed by the overrides
 */
export function orderWith(overrides: Partial<AdminOrder>): AdminOrder {
  return {
    id: 'order-1',
    code: 'CP10001',
    status: 'confirmed',
    needsAttention: false,
    channel: 'web',
    customerName: 'Eva Mamani',
    customerPhone: '71234567',
    deliveryMethod: 'pickup_point',
    itemsTotal: 120,
    units: 1,
    createdAt: '2026-11-18T14:05:00Z',
    statusBeforeCancel: null,
    cancelReason: null,
    destinationCity: null,
    recipientName: null,
    recipientIdNumber: null,
    pickupFee: 2,
    shippingPaidByStore: false,
    reservedUntil: null,
    paymentProofPath: null,
    shippingReceiptPath: null,
    items: [],
    ...overrides,
  };
}
