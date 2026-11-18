import { confirmedMessage, messagesFor } from './customer-messages';
import { orderWith } from './admin-order.fixture';

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

describe('messagesFor', () => {
  const pickup = { address: 'Calle 21 de Calacoto', hours: 'Lun a sáb, 10:00 a 19:00', notice: '' };

  it('offers the ready for pickup message with the pickup point and fee', () => {
    const [message] = messagesFor(orderWith({ status: 'ready_for_pickup' }), pickup);

    expect(message.text).toBe(
      '¡Hola Eva! Tu pedido CP10001 ya está listo para recoger.\n' +
        '📍 Calle 21 de Calacoto\n' +
        '🕒 Lun a sáb, 10:00 a 19:00\n' +
        'Recojo: Bs 2 al recoger',
    );
  });

  it('waits for the shipping receipt before offering its message', () => {
    const shipped = orderWith({
      status: 'shipped',
      deliveryMethod: 'bus_parcel',
      destinationCity: 'Oruro',
    });

    expect(messagesFor(shipped, pickup)).toEqual([]);
    expect(
      messagesFor(
        { ...shipped, shippingReceiptPath: 'x/guia.jpg', shippingPaidByStore: true },
        pickup,
      )[0].text,
    ).toBe(
      '¡Hola Eva! Tu pedido CP10001 ya fue enviado por flota a Oruro. Te mando la foto de la guía.\n' +
        'El envío ya está pagado por CutePet.',
    );
  });

  it('explains a rejected proof with the owner reason', () => {
    const rejected = orderWith({
      status: 'cancelled',
      statusBeforeCancel: 'proof_uploaded',
      cancelReason: 'El monto no coincide.',
    });

    expect(messagesFor(rejected, pickup)[0].text).toContain(
      'no pudimos confirmar el pago: el monto no coincide. ¿Nos ayudas a revisarlo?',
    );
    expect(messagesFor({ ...rejected, statusBeforeCancel: 'confirmed' }, pickup)).toEqual([]);
    expect(messagesFor({ ...rejected, cancelReason: 'QR vencido' }, pickup)[0].text).toContain(
      'el pago: QR vencido.',
    );
  });
});
