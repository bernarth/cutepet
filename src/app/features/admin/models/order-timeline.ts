import { ORDER_STATUS_LABELS, OrderStatus } from '@core/orders/order-status';
import { AuditEntry } from './audit-entry';

export interface TimelineEvent {
  readonly id: number;
  readonly title: string;
  readonly actor: string;
  readonly at: string;
  readonly reason: string | null;
}

/**
 * @description Turns the audit rows of one order into readable steps. Changes nobody needs to see (like a new reservation time) are left out
 */
export function toTimeline(entries: readonly AuditEntry[]): TimelineEvent[] {
  return entries.flatMap((entry) => {
    const title = eventTitle(entry);
    return title
      ? [
          {
            id: entry.id,
            title,
            actor: entry.actorLabel,
            at: entry.createdAt,
            reason: isOwnerChange(entry) ? null : entry.reason,
          },
        ]
      : [];
  });
}

/** A guest's order moved to their Google account. The stored reason is a code the title already explains */
function isOwnerChange({ action, oldData, newData }: AuditEntry): boolean {
  const owner = newData?.['customer_id'];
  return action === 'update' && Boolean(owner) && oldData?.['customer_id'] !== owner;
}

function eventTitle(entry: AuditEntry): string | null {
  const before = entry.oldData ?? {};
  const after = entry.newData ?? {};

  if (entry.action === 'insert') {
    return after['channel'] === 'whatsapp'
      ? 'Venta rápida registrada'
      : `Pedido creado: ${statusLabel(after['status'])}`;
  }
  if (before['status'] !== after['status']) {
    return statusChangeTitle(before['status'], after['status']);
  }
  if (isOwnerChange(entry)) {
    return 'Pedido pasado a la cuenta del cliente';
  }
  if (before['shipping_receipt_path'] !== after['shipping_receipt_path']) {
    return 'Guía de envío adjuntada';
  }
  if (!before['needs_attention'] && after['needs_attention']) {
    return 'Necesita revisión: alguna prenda ya no estaba libre';
  }
  return null;
}

function statusChangeTitle(from: unknown, to: unknown): string {
  if (to === 'cancelled') {
    return from === 'proof_uploaded' ? 'Comprobante rechazado' : 'Pedido cancelado';
  }
  if (from === 'cancelled') {
    return `Pedido restaurado: ${statusLabel(to)}`;
  }
  return `${statusLabel(from)} → ${statusLabel(to)}`;
}

function statusLabel(status: unknown): string {
  return typeof status === 'string' && status in ORDER_STATUS_LABELS
    ? ORDER_STATUS_LABELS[status as OrderStatus]
    : 'Sin estado';
}
