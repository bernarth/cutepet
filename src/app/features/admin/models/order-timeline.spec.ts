import { AuditEntry, toTimeline } from './order-timeline';

const entry = (overrides: Partial<AuditEntry>): AuditEntry => ({
  id: 1,
  action: 'update',
  oldData: null,
  newData: null,
  reason: null,
  actorLabel: 'Dueña',
  createdAt: '2026-11-18T14:05:00Z',
  ...overrides,
});

describe('toTimeline', () => {
  it('describes creation, status changes, rejections and restores', () => {
    const events = toTimeline([
      entry({ id: 4, oldData: { status: 'cancelled' }, newData: { status: 'proof_uploaded' } }),
      entry({
        id: 3,
        oldData: { status: 'proof_uploaded' },
        newData: { status: 'cancelled' },
        reason: 'Monto incorrecto',
      }),
      entry({
        id: 2,
        oldData: { status: 'pending_payment' },
        newData: { status: 'proof_uploaded' },
      }),
      entry({
        id: 1,
        action: 'insert',
        newData: { status: 'pending_payment', channel: 'web' },
        actorLabel: 'Cliente',
      }),
    ]);

    expect(events.map((event) => event.title)).toEqual([
      'Pedido restaurado: Comprobante subido',
      'Comprobante rechazado',
      'Pendiente de pago → Comprobante subido',
      'Pedido creado: Pendiente de pago',
    ]);
    expect(events[1].reason).toBe('Monto incorrecto');
    expect(events[3].actor).toBe('Cliente');
  });

  it('names quick sales and attached receipts, and skips silent changes', () => {
    const events = toTimeline([
      entry({
        id: 3,
        oldData: { status: 'shipped', reserved_until: 'a' },
        newData: { status: 'shipped', reserved_until: 'b' },
      }),
      entry({
        id: 2,
        oldData: { shipping_receipt_path: null },
        newData: { shipping_receipt_path: 'x/guia.jpg' },
      }),
      entry({ id: 1, action: 'insert', newData: { status: 'confirmed', channel: 'whatsapp' } }),
    ]);

    expect(events.map((event) => event.title)).toEqual([
      'Guía de envío adjuntada',
      'Venta rápida registrada',
    ]);
  });
});
