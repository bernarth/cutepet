import { orderWith } from './admin-order.fixture';
import { actionLabel, availableActions } from './order-actions';

describe('availableActions', () => {
  it('lets the owner confirm, reject or send back an uploaded proof', () => {
    expect(availableActions(orderWith({ status: 'proof_uploaded' }))).toEqual([
      'confirm',
      'reject',
      'revert',
    ]);
  });

  it('never reverts a quick sale below confirmed', () => {
    expect(availableActions(orderWith({ channel: 'whatsapp' }))).toEqual(['advance', 'cancel']);
    expect(availableActions(orderWith({ channel: 'web' }))).toEqual([
      'advance',
      'revert',
      'cancel',
    ]);
  });

  it('only restores a cancelled order and only reverts a delivered one', () => {
    expect(availableActions(orderWith({ status: 'cancelled' }))).toEqual(['restore']);
    expect(availableActions(orderWith({ status: 'delivered' }))).toEqual(['revert']);
  });
});

describe('actionLabel', () => {
  it('names the next step by delivery method', () => {
    expect(actionLabel('advance', orderWith({}))).toBe('Marcar listo para recoger');
    expect(actionLabel('advance', orderWith({ deliveryMethod: 'bus_parcel' }))).toBe(
      'Marcar enviado',
    );
    expect(actionLabel('advance', orderWith({ status: 'shipped' }))).toBe('Marcar entregado');
  });

  it('names the status a revert goes back to', () => {
    expect(
      actionLabel('revert', orderWith({ status: 'delivered', deliveryMethod: 'bus_parcel' })),
    ).toBe('Volver a "Enviado"');
  });
});
