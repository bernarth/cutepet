import { Service, computed, inject, resource, signal } from '@angular/core';

import { OrderListFilter } from '../models/admin-order';
import { AdminOrderRepository } from './admin-order.repository';

const PAGE_SIZE = 30;

@Service()
export class AdminOrdersStore {
  private readonly repository = inject(AdminOrderRepository);

  readonly filter = signal<OrderListFilter>('to_review');
  readonly search = signal('');
  private readonly limit = signal(PAGE_SIZE);

  private readonly orders = resource({
    params: () => ({ filter: this.filter(), search: this.search(), limit: this.limit() }),
    loader: ({ params }) => this.repository.listOrders(params),
  });
  private readonly toReview = resource({ loader: () => this.repository.countToReview() });

  readonly list = computed(() => this.orders.value() ?? []);
  readonly isLoading = this.orders.isLoading;
  readonly hasError = computed(() => this.orders.error() !== undefined);
  readonly toReviewCount = computed(() => this.toReview.value() ?? 0);
  /** A full page means there may be more */
  readonly canLoadMore = computed(() => this.list().length === this.limit());

  setFilter(filter: OrderListFilter): void {
    this.filter.set(filter);
    this.limit.set(PAGE_SIZE);
  }

  setSearch(search: string): void {
    this.search.set(search);
    this.limit.set(PAGE_SIZE);
  }

  loadMore(): void {
    this.limit.update((limit) => limit + PAGE_SIZE);
  }

  reload(): void {
    this.orders.reload();
    this.toReview.reload();
  }
}
