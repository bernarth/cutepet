import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { formatPrice } from '@shared/pipes/price';
import { AdminOrder } from '../models/admin-order';
import { DELIVERY_LABELS } from '@core/orders/customer-details';

export interface MessageLink {
  readonly label: string;
  readonly url: string;
}

@Component({
  selector: 'cp-order-customer-panel',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <h2 id="order-customer">Cliente y entrega</h2>
    @for (line of lines(); track $index) {
      <p>{{ line }}</p>
    }
    <p class="meta">{{ paymentNote() }}</p>
    <div class="links">
      <a mat-stroked-button [href]="chatUrl()" target="_blank" rel="noopener">
        <mat-icon>chat</mat-icon>
        Abrir chat
      </a>
      @for (message of messages(); track message.label) {
        <a mat-flat-button [href]="message.url" target="_blank" rel="noopener">
          <mat-icon>send</mat-icon>
          {{ message.label }}
        </a>
      }
    </div>
  `,
  styleUrl: './order-panel.scss',
  host: { role: 'region', 'aria-labelledby': 'order-customer' },
})
export class OrderCustomerPanel {
  readonly order = input.required<AdminOrder>();
  readonly chatUrl = input.required<string>();
  readonly messages = input<readonly MessageLink[]>([]);

  protected readonly lines = computed(() => {
    const order = this.order();
    const lines = [
      `${order.customerName} · ${order.customerPhone}`,
      DELIVERY_LABELS[order.deliveryMethod],
    ];

    if (order.deliveryMethod === 'bus_parcel') {
      lines.push(`Destino: ${order.destinationCity ?? ''} · Recibe: ${order.recipientName ?? ''}`);
      if (order.recipientIdNumber) {
        lines.push(`Carnet: ${order.recipientIdNumber}`);
      }
    }
    return lines;
  });

  protected readonly paymentNote = computed(() => {
    const order = this.order();

    if (order.deliveryMethod === 'bus_parcel') {
      return order.shippingPaidByStore
        ? 'CutePet paga el envío (promoción).'
        : 'El envío se paga en la terminal.';
    }
    return order.pickupFee > 0
      ? `Paga ${formatPrice(order.pickupFee)} al recoger.`
      : 'Recojo gratis.';
  });
}
