import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { EmptyState } from '@shared/ui/empty-state';
import { OrderReceived } from '../models/order-received';

@Component({
  selector: 'cp-order-received-card',
  imports: [RouterLink, MatButtonModule, EmptyState],
  template: `
    <cp-empty-state
      [icon]="received().delivery ? 'check_circle' : 'info'"
      [message]="received().message"
    >
      <p class="code">Pedido {{ code() }}</p>
      @if (received().contact; as contact) {
        <p>{{ contact }}</p>
      }
      @if (received().delivery; as delivery) {
        <section class="delivery" aria-labelledby="delivery-title">
          <h2 id="delivery-title">{{ delivery.title }}</h2>
          <ul>
            @for (line of delivery.lines; track line) {
              <li>{{ line }}</li>
            }
          </ul>
        </section>
      }
      <a mat-flat-button routerLink="/catalogo">Seguir viendo prendas</a>
    </cp-empty-state>
  `,
  styles: `
    p,
    h2,
    ul {
      margin: 0;
    }
    .code {
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
    .delivery {
      width: 100%;
      max-width: 420px;
      margin: var(--cp-space-sm) 0;
      padding: var(--cp-space-md);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-lowest);
      text-align: start;
    }
    h2 {
      font: var(--mat-sys-title-medium);
      font-family: var(--cp-font-display);
    }
    ul {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
      margin-top: var(--cp-space-sm);
      padding-inline-start: var(--cp-space-md);
      font: var(--mat-sys-body-medium);
    }
  `,
})
export class OrderReceivedCard {
  readonly received = input.required<OrderReceived>();
  readonly code = input.required<string>();
}
