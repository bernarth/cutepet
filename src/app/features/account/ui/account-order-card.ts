import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { DateTimePipe } from '@core/dates/date-time.pipe';
import { OrderStatusBadge } from '@core/orders/order-status-badge';
import { PricePipe } from '@shared/pipes/price';
import { AccountOrder } from '../models/account-order';

@Component({
  selector: 'cp-account-order-card',
  imports: [RouterLink, MatButtonModule, PricePipe, DateTimePipe, OrderStatusBadge],
  template: `
    <div class="top">
      <h3>{{ order().code }}</h3>
      <cp-order-status-badge [status]="order().status" />
    </div>
    <ul>
      @for (piece of order().pieces; track $index) {
        <li>{{ piece }}</li>
      }
    </ul>
    <p class="meta">{{ order().itemsTotal | price }} · {{ order().createdAt | dateTime }}</p>
    @if (order().paymentLabel; as label) {
      <a mat-stroked-button [routerLink]="['/pagar', order().code]">{{ label }}</a>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--cp-space-xs);
      padding: var(--cp-space-md);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-lowest);
    }
    .top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--cp-space-sm);
      width: 100%;
    }
    h3 {
      margin: 0;
      font: var(--mat-sys-title-medium);
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      overflow-wrap: anywhere;
    }
    .meta {
      margin: 0;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    a {
      margin-top: var(--cp-space-xs);
    }
  `,
})
export class AccountOrderCard {
  readonly order = input.required<AccountOrder>();
}
