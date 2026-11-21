import { PickupInfo } from '@core/settings/store-settings';

import { CheckoutOrder } from './checkout-order';
import { NEEDS_ATTENTION_MESSAGE, orderReceived } from './order-received';

const pickup: PickupInfo = {
  address: 'Calle 21 de Calacoto',
  hours: '15:00 a 19:00',
  notice: 'Después de 1 semana se cobra un extra.',
};

const order = (changes: Partial<CheckoutOrder>): CheckoutOrder => ({
  id: 'order-1',
  code: 'CP10023',
  status: 'proof_uploaded',
  cancelReason: null,
  statusBeforeCancel: null,
  needsAttention: false,
  deliveryMethod: 'pickup_point',
  destinationCity: null,
  itemsTotal: 350,
  pickupFee: 2,
  shippingPaidByStore: false,
  customerPhone: '71234567',
  secondsLeft: null,
  ...changes,
});

describe('orderReceived', () => {
  it('gives the pickup point, its hours, the notice and the fee', () => {
    expect(orderReceived(order({}), pickup)).toEqual({
      message:
        'Recibimos tu comprobante 🐾 Te escribiremos por WhatsApp cuando confirmemos tu pago.',
      contact: 'Te escribiremos al 7123 4567 por WhatsApp.',
      delivery: {
        title: 'Recojo en La Paz',
        lines: [
          'Dirección: Calle 21 de Calacoto',
          'Horario: 15:00 a 19:00',
          'Después de 1 semana se cobra un extra.',
          'Pagas Bs 2 al recoger.',
        ],
      },
    });
  });

  it('leaves out empty pickup settings and says when pickup is free', () => {
    const lines = orderReceived(order({ pickupFee: 0 }), { address: '', hours: '', notice: '' })
      .delivery?.lines;
    expect(lines).toEqual(['El recojo es gratis.']);
  });

  it('promises the shipping receipt for bus parcels and says who pays', () => {
    const parcel = order({ deliveryMethod: 'bus_parcel', destinationCity: 'Cochabamba' });

    expect(orderReceived(parcel, pickup).delivery?.lines).toEqual([
      'Enviamos tu pedido por flota a Cochabamba. Te mandaremos la guía de envío por WhatsApp.',
      'El envío lo pagas en la terminal al recoger tu encomienda.',
    ]);
    expect(orderReceived({ ...parcel, shippingPaidByStore: true }, pickup).delivery?.lines[1]).toBe(
      'El envío lo paga CutePet.',
    );
  });

  it('only says the owner will write when a piece was no longer free', () => {
    expect(orderReceived(order({ needsAttention: true }), pickup)).toEqual({
      message: NEEDS_ATTENTION_MESSAGE,
      contact: 'Te escribiremos al 7123 4567 por WhatsApp.',
      delivery: null,
    });
  });

  it('says the payment is confirmed once the order moved on', () => {
    expect(orderReceived(order({ status: 'confirmed' }), pickup).message).toBe(
      'Tu pago está confirmado 🐾 ¡Gracias por tu compra!',
    );
  });
});
