import { Service, computed, inject, resource, signal } from '@angular/core';

import { ProductListFilter } from '../models/admin-product';
import { matchesProductFilter } from '../models/admin-product.mapper';
import { AdminProductRepository } from './admin-product.repository';

/**
 * @description Product list of the panel. Filtering happens in the browser: the store has few products
 */
@Service()
export class AdminProductsStore {
  private readonly repository = inject(AdminProductRepository);

  private readonly products = resource({ loader: () => this.repository.listProducts() });

  readonly filter = signal<ProductListFilter>('for_sale');
  readonly search = signal('');

  readonly isLoading = this.products.isLoading;
  readonly hasError = computed(() => this.products.error() !== undefined);

  readonly visible = computed(() =>
    (this.products.value() ?? []).filter((product) =>
      matchesProductFilter(product, this.filter(), this.search()),
    ),
  );

  readonly counts = computed<Record<ProductListFilter, number>>(() => {
    const products = this.products.value() ?? [];
    const count = (filter: ProductListFilter) =>
      products.filter((product) => matchesProductFilter(product, filter, '')).length;

    return {
      for_sale: count('for_sale'),
      sold_out: count('sold_out'),
      archived: count('archived'),
    };
  });

  reload(): void {
    this.products.reload();
  }
}
