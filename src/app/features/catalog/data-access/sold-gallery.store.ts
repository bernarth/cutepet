import { Service, computed, inject, resource } from '@angular/core';

import { ProductRepository } from './product.repository';

/** Provided by SoldGalleryPage */
@Service({ autoProvided: false })
export class SoldGalleryStore {
  private readonly products = inject(ProductRepository);

  private readonly soldList = resource({
    id: 'sold-products',
    loader: () => this.products.listSold(),
  });

  readonly items = computed(() => (this.soldList.hasValue() ? this.soldList.value() : []));
  readonly isLoading = computed(() => this.soldList.isLoading());
  readonly hasError = computed(() => this.soldList.status() === 'error');
}
