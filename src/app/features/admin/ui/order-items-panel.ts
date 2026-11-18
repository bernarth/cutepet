import { Component, input } from '@angular/core';

import { PricePipe } from '@shared/pipes/price';
import { AdminOrderItem } from '../models/admin-order';

@Component({
  selector: 'cp-order-items-panel',
  imports: [PricePipe],
  template: `
    <h2 id="order-items">Prendas</h2>
    <ul class="items">
      @for (item of items(); track $index) {
        <li>
          <span>
            @if (item.quantity > 1) {
              {{ item.quantity }} x
            }
            {{ item.productName }} · Talla {{ item.sizeLabel }}
          </span>
          <span>{{ item.unitPrice * item.quantity | price }}</span>
        </li>
      }
    </ul>
    <p class="total">Total {{ total() | price }}</p>
  `,
  styleUrl: './order-panel.scss',
  host: { role: 'region', 'aria-labelledby': 'order-items' },
})
export class OrderItemsPanel {
  readonly items = input.required<readonly AdminOrderItem[]>();
  readonly total = input.required<number>();
}
