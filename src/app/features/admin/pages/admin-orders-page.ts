import { Component, DestroyRef, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ORDER_STATUS_LABELS, OrderStatus } from '@core/orders/order-status';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { AdminOrdersStore } from '../data-access/admin-orders.store';
import { OrderListFilter } from '../models/admin-order';
import { OrderCard } from '../ui/order-card';

const SEARCH_DELAY_MS = 300;

const FILTERS: readonly { value: OrderListFilter; label: string }[] = [
  { value: 'to_review', label: 'Por revisar' },
  ...(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => ({
    value: status,
    label: ORDER_STATUS_LABELS[status],
  })),
  { value: 'all', label: 'Todos' },
];

@Component({
  selector: 'cp-admin-orders-page',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    EmptyState,
    LoadingBar,
    OrderCard,
  ],
  templateUrl: './admin-orders-page.html',
  styleUrl: './admin-orders-page.scss',
})
export class AdminOrdersPage {
  protected readonly store = inject(AdminOrdersStore);
  protected readonly filters = FILTERS;
  protected readonly toReviewText = computed(() => {
    const count = this.store.toReviewCount();
    if (count === 0) {
      return 'No hay comprobantes por revisar.';
    }
    return count === 1 ? '1 comprobante por revisar.' : `${count} comprobantes por revisar.`;
  });
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.store.reload();
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  /**
   * @description Waits until the admin stops typing before asking the database
   */
  protected onSearch(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(text), SEARCH_DELAY_MS);
  }
}
