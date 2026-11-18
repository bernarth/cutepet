import { confirmedMessage } from './customer-messages';

describe('confirmedMessage', () => {
  it('thanks the customer by first name and says what happens next for pickup', () => {
    expect(
      confirmedMessage({
        customerName: 'Eva Mamani',
        code: 'CP10072',
        itemsTotal: 120,
        deliveryMethod: 'pickup_point',
      }),
    ).toBe(
      '¡Hola Eva! Recibimos tu pago del pedido CP10072 por Bs 120. ¡Gracias por tu compra! 🐾\n' +
        'Te avisamos cuando esté listo para recoger.',
    );
  });

  it('promises the shipping receipt for bus parcel orders', () => {
    const message = confirmedMessage({
      customerName: 'Luis',
      code: 'CP10073',
      itemsTotal: 95.5,
      deliveryMethod: 'bus_parcel',
    });

    expect(message).toContain('por Bs 95,50.');
    expect(message.endsWith('Te enviaremos la guía cuando lo despachemos.')).toBe(true);
  });
});
