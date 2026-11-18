import { AuditEntry } from './audit-entry';
import { AuditLookups } from './audit-fields';
import { toAuditRow } from './audit-row';

const lookups: AuditLookups = {
  sizes: new Map([
    [4, '1'],
    [5, '2'],
  ]),
  categories: new Map([[1, 'Abrigos']]),
  petTypes: new Map([[1, 'Perro']]),
};

const entry = (overrides: Partial<AuditEntry>): AuditEntry => ({
  id: 1,
  tableName: 'orders',
  recordId: 'x',
  action: 'update',
  oldData: null,
  newData: null,
  reason: null,
  actorLabel: 'Dueña',
  createdAt: '2026-11-18T14:05:00Z',
  ...overrides,
});

describe('toAuditRow', () => {
  it('describes an order status change in Spanish and links to the order', () => {
    const row = toAuditRow(
      entry({
        oldData: { code: 'CP10456', status: 'confirmed', reserved_until: 'a' },
        newData: { code: 'CP10456', status: 'shipped', reserved_until: 'b' },
        reason: 'Salió en la flota de la tarde',
      }),
      lookups,
    );

    expect(row.title).toBe('Pedido CP10456');
    expect(row.link).toEqual(['/admin/pedidos', 'CP10456']);
    expect(row.changes).toEqual([{ label: 'Estado', before: 'Confirmado', after: 'Enviado' }]);
    expect(row.reason).toBe('Salió en la flota de la tarde');
  });

  it('shows a stock adjustment and links a size to its product', () => {
    const row = toAuditRow(
      entry({
        tableName: 'variants',
        oldData: { product_id: 77, size_id: 5, stock: 2 },
        newData: { product_id: 77, size_id: 5, stock: 1 },
      }),
      lookups,
    );

    expect(row.title).toBe('Talla 2 de una prenda');
    expect(row.link).toEqual(['/admin/prendas', 77]);
    expect(row.changes).toEqual([{ label: 'Stock', before: '2', after: '1' }]);
  });

  it('reads ids, money, files and yes or no values as words', () => {
    const row = toAuditRow(
      entry({
        tableName: 'products',
        oldData: { id: 7, category_id: 2, price: 120, is_active: true, description: 'a' },
        newData: { id: 7, category_id: 1, price: 95.5, is_active: false, description: 'b' },
      }),
      lookups,
    );

    expect(row.changes).toEqual([
      { label: 'Descripción', before: null, after: 'actualizada' },
      { label: 'Precio', before: 'Bs 120', after: 'Bs 95,50' },
      { label: 'Publicada', before: 'sí', after: 'no' },
      { label: 'Categoría', before: 'Categoría sin nombre', after: 'Abrigos' },
    ]);
  });

  it('lists the starting values of a creation and nothing for a deletion', () => {
    const created = toAuditRow(
      entry({
        tableName: 'variants',
        action: 'insert',
        newData: { product_id: 3, size_id: 4, stock: 1, neck_cm: null },
      }),
      lookups,
    );
    const deleted = toAuditRow(
      entry({
        tableName: 'product_photos',
        action: 'delete',
        oldData: { product_id: 3, alt_text: 'Foto 1' },
      }),
      lookups,
    );

    expect(created.action).toBe('Creado');
    expect(created.changes).toEqual([
      { label: 'Talla', before: null, after: 'Talla 1' },
      { label: 'Stock', before: null, after: '1' },
    ]);
    expect(deleted.action).toBe('Eliminado');
    expect(deleted.changes).toEqual([]);
    expect(deleted.link).toEqual(['/admin/prendas', 3]);
  });

  it('marks attached files without showing their storage path', () => {
    const row = toAuditRow(
      entry({
        oldData: { code: 'CP1', shipping_receipt_path: null },
        newData: { code: 'CP1', shipping_receipt_path: 'a/b.jpg' },
      }),
      lookups,
    );

    expect(row.changes).toEqual([
      { label: 'Guía de envío', before: 'sin archivo', after: 'adjuntado' },
    ]);
  });
});
