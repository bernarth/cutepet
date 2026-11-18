import { orderWith } from './admin-order.fixture';
import { actionDialogText } from './order-action-dialogs';

describe('actionDialogText', () => {
  it('reminds the owner to check the bank app before confirming', () => {
    const text = actionDialogText(
      'confirm',
      orderWith({ status: 'proof_uploaded', itemsTotal: 95.5 }),
    );

    expect(text.message).toBe(
      'Revisa en la app del banco que llegó Bs 95,50 con la glosa CP10001. Las prendas quedan vendidas.',
    );
    expect(text.reasonSuggestions).toBeNull();
  });

  it('warns, without blocking, when a bus parcel order is shipped without a receipt', () => {
    const order = orderWith({ deliveryMethod: 'bus_parcel' });

    expect(actionDialogText('advance', order).message).toContain('Aún no adjuntaste la guía');
    expect(
      actionDialogText('advance', { ...order, shippingReceiptPath: 'x/guia.jpg' }).message,
    ).not.toContain('guía');
  });

  it('asks for a reason to reject, cancel, revert and restore', () => {
    const cancelled = orderWith({ status: 'cancelled', statusBeforeCancel: 'confirmed' });

    expect(
      actionDialogText('reject', orderWith({ status: 'proof_uploaded' })).reasonSuggestions,
    ).toContain('El monto no coincide');
    expect(actionDialogText('restore', cancelled).message).toContain('Vuelve a "Confirmado"');
    expect(actionDialogText('cancel', orderWith({})).reasonSuggestions).not.toBeNull();
    expect(actionDialogText('revert', orderWith({})).reasonSuggestions).not.toBeNull();
  });
});
