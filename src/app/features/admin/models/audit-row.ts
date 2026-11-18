import { AuditEntry } from './audit-entry';
import { AuditChange, AuditLookups, auditChanges } from './audit-fields';

export interface AuditEntity {
  readonly table: string;
  readonly label: string;
}

/** Entities the admin can filter by, in the order the panel shows them */
export const AUDIT_ENTITIES: readonly AuditEntity[] = [
  { table: 'orders', label: 'Pedidos' },
  { table: 'products', label: 'Prendas' },
  { table: 'variants', label: 'Tallas de prendas' },
  { table: 'product_photos', label: 'Fotos' },
  { table: 'settings', label: 'Configuración' },
  { table: 'categories', label: 'Categorías' },
  { table: 'pet_types', label: 'Tipos de mascota' },
  { table: 'sizes', label: 'Tabla de tallas' },
  { table: 'order_items', label: 'Prendas de pedidos' },
  { table: 'user_roles', label: 'Acceso al panel' },
];

const ACTION_LABELS: Readonly<Record<string, string>> = {
  insert: 'Creado',
  update: 'Cambiado',
  delete: 'Eliminado',
};

export interface AuditRow {
  readonly id: number;
  readonly title: string;
  /** Route to the order or product the entry belongs to */
  readonly link: readonly (string | number)[] | null;
  readonly action: string;
  readonly actor: string;
  readonly at: string;
  readonly reason: string | null;
  readonly changes: readonly AuditChange[];
}

export function toAuditRow(entry: AuditEntry, lookups: AuditLookups): AuditRow {
  const data = entry.newData ?? entry.oldData ?? {};

  return {
    id: entry.id,
    title: titleOf(entry.tableName, data, lookups),
    link: linkOf(entry.tableName, data),
    action: ACTION_LABELS[entry.action] ?? entry.action,
    actor: entry.actorLabel,
    at: entry.createdAt,
    reason: entry.reason,
    changes: entry.action === 'delete' ? [] : auditChanges(entry.oldData, entry.newData, lookups),
  };
}

function titleOf(
  table: string,
  data: Readonly<Record<string, unknown>>,
  lookups: AuditLookups,
): string {
  switch (table) {
    case 'orders':
      return `Pedido ${text(data['code'])}`;
    case 'order_items':
      return `Prenda de un pedido: ${text(data['product_name'])}`;
    case 'products':
      return `Prenda: ${text(data['name'])}`;
    case 'variants':
      return `Talla ${lookups.sizes.get(Number(data['size_id'])) ?? '?'} de una prenda`;
    case 'product_photos':
      return 'Foto de una prenda';
    case 'settings':
      return 'Configuración de la tienda';
    case 'sizes':
      return `Tabla de tallas: talla ${text(data['label'])}`;
    case 'user_roles':
      return 'Acceso al panel';
    default:
      return `${entityLabel(table)}: ${text(data['name'])}`;
  }
}

function linkOf(table: string, data: Readonly<Record<string, unknown>>): AuditRow['link'] {
  if (table === 'orders' && data['code']) {
    return ['/admin/pedidos', text(data['code'])];
  }
  if (table === 'products' && data['id']) {
    return ['/admin/prendas', Number(data['id'])];
  }
  if ((table === 'variants' || table === 'product_photos') && data['product_id']) {
    return ['/admin/prendas', Number(data['product_id'])];
  }
  return null;
}

function entityLabel(table: string): string {
  return AUDIT_ENTITIES.find((entity) => entity.table === table)?.label ?? table;
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
