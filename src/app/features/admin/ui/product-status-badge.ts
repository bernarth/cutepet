import { Component, computed, input } from '@angular/core';

import { ADMIN_PRODUCT_STATUS_LABELS, AdminProductStatus } from '../models/admin-product';

@Component({
  selector: 'cp-product-status-badge',
  template: `{{ label() }}`,
  host: { '[class]': 'status()' },
  styles: `
    :host {
      display: inline-block;
      padding: 2px var(--cp-space-sm);
      border-radius: var(--cp-radius);
      font: var(--mat-sys-label-medium);
      color: var(--cp-ink);
      background: var(--mat-sys-surface-container-high);
    }
    :host(.available) {
      background: color-mix(in srgb, var(--cp-success) 45%, var(--cp-bg));
    }
    :host(.reserved) {
      background: color-mix(in srgb, var(--cp-lavender) 60%, var(--cp-bg));
    }
    :host(.sold_out) {
      background: color-mix(in srgb, var(--cp-sky) 60%, var(--cp-bg));
    }
    :host(.no_sizes) {
      background: color-mix(in srgb, var(--cp-brand) 60%, var(--cp-bg));
    }
  `,
})
export class ProductStatusBadge {
  readonly status = input.required<AdminProductStatus>();
  protected readonly label = computed(() => ADMIN_PRODUCT_STATUS_LABELS[this.status()]);
}
