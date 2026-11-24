import { Component, computed, input } from '@angular/core';

import { ORDER_STATUS_LABELS, OrderStatus } from './order-status';

@Component({
  selector: 'cp-order-status-badge',
  template: `{{ label() }}`,
  host: { '[class]': 'status()' },
  styles: `
    :host {
      display: inline-block;
      padding: 2px var(--cp-space-sm);
      border-radius: var(--cp-radius);
      font: var(--mat-sys-label-medium);
      color: var(--cp-ink);
      background: var(--mat-sys-surface-container-highest);
    }
    :host(.proof_uploaded) {
      background: var(--cp-brand-soft);
    }
    :host(.confirmed),
    :host(.ready_for_pickup),
    :host(.shipped) {
      background: color-mix(in srgb, var(--cp-lavender) 60%, var(--cp-bg));
    }
    :host(.delivered) {
      background: color-mix(in srgb, var(--cp-success) 45%, var(--cp-bg));
    }
  `,
})
export class OrderStatusBadge {
  readonly status = input.required<OrderStatus>();
  protected readonly label = computed(() => ORDER_STATUS_LABELS[this.status()]);
}
