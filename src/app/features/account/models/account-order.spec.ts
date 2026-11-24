import { AccountOrderRow, toAccountOrder } from './account-order';

const row: AccountOrderRow = {
  code: 'CP10001',
  status: 'confirmed',
  cancel_reason: null,
  items_total: 310,
  created_at: '2026-11-24T14:00:00Z',
  order_items: [
    { product_name: 'Abrigo Osito', quantity: 1 },
    { product_name: 'Vestido Floral', quantity: 2 },
  ],
};

describe('toAccountOrder', () => {
  it('lists the pieces with their quantity', () => {
    expect(toAccountOrder(row).pieces).toEqual(['Abrigo Osito', '2 x Vestido Floral']);
  });

  it('offers the payment screen only while there is something to pay or prove', () => {
    const label = (changes: Partial<AccountOrderRow>) =>
      toAccountOrder({ ...row, ...changes }).paymentLabel;

    expect(label({ status: 'pending_payment' })).toBe('Continuar pago');
    expect(label({ status: 'cancelled', cancel_reason: 'reservation_expired' })).toBe(
      'Ya pagué, subir comprobante',
    );
    expect(label({ status: 'cancelled', cancel_reason: 'cancelled_by_customer' })).toBeNull();
    expect(label({ status: 'proof_uploaded' })).toBeNull();
  });
});
