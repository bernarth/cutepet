import { checkoutNotice } from './checkout-notice';
import { CheckoutOrder, CheckoutOrderRow, checkoutView, toCheckoutOrder } from './checkout-order';

const row: CheckoutOrderRow = {
  id: 'order-1',
  code: 'CP10023',
  status: 'pending_payment',
  cancel_reason: null,
  needs_attention: false,
  delivery_method: 'pickup_point',
  destination_city: null,
  items_total: 350,
  pickup_fee: 0,
  shipping_paid_by_store: false,
  seconds_left: 840,
};

const order = (changes: Partial<CheckoutOrder>): CheckoutOrder => ({
  ...toCheckoutOrder(row),
  ...changes,
});

describe('toCheckoutOrder', () => {
  it('keeps the columns the database can leave empty as null', () => {
    const mapped = toCheckoutOrder({ ...row, status: 'proof_uploaded', seconds_left: null });

    expect(mapped.cancelReason).toBeNull();
    expect(mapped.destinationCity).toBeNull();
    expect(mapped.secondsLeft).toBeNull();
    expect(mapped.itemsTotal).toBe(350);
  });
});

describe('checkoutView', () => {
  it('asks to pay while the reservation runs', () => {
    expect(checkoutView(order({}), 840)).toBe('pay');
  });

  it('shows the expired screen when the countdown reaches zero, before the server answers', () => {
    expect(checkoutView(order({}), 0)).toBe('expired');
  });

  it('tells an expired reservation from any other cancellation', () => {
    const expired = order({ status: 'cancelled', cancelReason: 'reservation_expired' });
    const cancelled = order({ status: 'cancelled', cancelReason: 'cancelled_by_customer' });

    expect(checkoutView(expired, 0)).toBe('expired');
    expect(checkoutView(cancelled, 0)).toBe('cancelled');
  });

  it('shows the proof as received for every later status', () => {
    expect(checkoutView(order({ status: 'proof_uploaded' }), 0)).toBe('proof_received');
    expect(checkoutView(order({ status: 'confirmed' }), 0)).toBe('proof_received');
  });
});

describe('checkoutNotice', () => {
  it('has nothing to say while paying', () => {
    expect(checkoutNotice('pay')).toBeNull();
  });

  it('says there is no pending payment when no order was found', () => {
    expect(checkoutNotice(null)?.message).toBe('No tienes un pago pendiente.');
  });
});
