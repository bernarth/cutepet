import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { PricePipe } from '@shared/pipes/price';
import { AdminOrderSummary } from '../models/admin-order';
import { DELIVERY_LABELS } from '@core/orders/customer-details';
import { DateTimePipe } from '@core/dates/date-time.pipe';
import { OrderStatusBadge } from '@core/orders/order-status-badge';

@Component({
  selector: 'cp-order-card',
  imports: [MatIconModule, RouterLink, PricePipe, DateTimePipe, OrderStatusBadge],
  template: `
    <a
      class="card"
      [routerLink]="['/admin/pedidos', order().code]"
      [class.flagged]="order().needsAttention"
    >
      <div class="top">
        <h2 class="code">{{ order().code }}</h2>
        <cp-order-status-badge [status]="order().status" />
      </div>
      @if (order().needsAttention) {
        <p class="attention"><mat-icon aria-hidden="true">warning</mat-icon>Necesita revisión</p>
      }
      <p class="customer">{{ order().customerName }} · {{ order().customerPhone }}</p>
      <p class="meta">
        {{ order().units }} {{ order().units === 1 ? 'prenda' : 'prendas' }} ·
        {{ order().itemsTotal | price }} · {{ deliveryLabels[order().deliveryMethod] }}
      </p>
      <p class="meta">
        {{ order().createdAt | dateTime }}
        @if (order().channel === 'whatsapp') {
          · Venta rápida
        }
      </p>
    </a>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
      padding: var(--cp-space-md);
      color: inherit;
      text-decoration: none;
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-lowest);
    }
    .flagged {
      border-color: var(--mat-sys-error);
    }
    .top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--cp-space-sm);
    }
    .code {
      margin: 0;
      font: var(--mat-sys-title-medium);
    }
    p {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .attention {
      display: flex;
      align-items: center;
      gap: var(--cp-space-xs);
      color: var(--mat-sys-error);
      font: var(--mat-sys-label-large);
    }
    .meta {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class OrderCard {
  readonly order = input.required<AdminOrderSummary>();
  protected readonly deliveryLabels = DELIVERY_LABELS;
}
