import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { EmptyState } from '@shared/ui/empty-state';
import { AccountOrder } from '../models/account-order';
import { AccountOrderCard } from './account-order-card';

@Component({
  selector: 'cp-account-orders',
  imports: [RouterLink, MatButtonModule, EmptyState, AccountOrderCard],
  template: `
    @if (hasError()) {
      <cp-empty-state icon="info" message="No pudimos cargar tus pedidos.">
        <button mat-stroked-button type="button" (click)="retry.emit()">Reintentar</button>
      </cp-empty-state>
    } @else if (orders().length > 0) {
      <div class="orders">
        @for (order of orders(); track order.code) {
          <cp-account-order-card [order]="order" />
        }
      </div>
    } @else if (!isLoading()) {
      <cp-empty-state icon="receipt_long" message="Todavía no tienes pedidos.">
        <a mat-stroked-button routerLink="/catalogo">Ver catálogo</a>
      </cp-empty-state>
    }
  `,
  styles: `
    .orders {
      display: grid;
      gap: var(--cp-space-sm);

      @media (min-width: 768px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class AccountOrders {
  readonly orders = input.required<readonly AccountOrder[]>();
  readonly isLoading = input.required<boolean>();
  readonly hasError = input.required<boolean>();
  readonly retry = output();
}
