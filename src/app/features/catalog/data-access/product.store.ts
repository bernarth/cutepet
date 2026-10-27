import { Service, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { LookupRepository } from './lookup.repository';
import { ProductRepository } from './product.repository';

/** Provided by ProductPage. Reads the slug from the route */
@Service({ autoProvided: false })
export class ProductStore {
  private readonly route = inject(ActivatedRoute);
  private readonly products = inject(ProductRepository);
  private readonly lookups = inject(LookupRepository);

  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly slug = computed(() => this.params().get('slug') ?? '');

  private readonly productResource = resource({
    id: 'product-detail',
    params: () => this.slug(),
    loader: ({ params: slug }) => this.products.findBySlug(slug),
  });

  private readonly sizing = resource({
    id: 'product-sizing',
    loader: async () => {
      const [sizes, toleranceCm] = await Promise.all([
        this.lookups.listActiveSizes(),
        this.lookups.getSizeToleranceCm(),
      ]);
      return { sizes, toleranceCm };
    },
  });

  readonly product = computed(() =>
    this.productResource.hasValue() ? this.productResource.value() : null,
  );
  readonly isLoading = computed(() => this.productResource.isLoading());
  readonly hasError = computed(() => this.productResource.status() === 'error');
  readonly notFound = computed(
    () => this.productResource.status() === 'resolved' && this.productResource.value() === null,
  );

  readonly sizes = computed(() => (this.sizing.hasValue() ? this.sizing.value().sizes : []));
  readonly toleranceCm = computed(() =>
    this.sizing.hasValue() ? this.sizing.value().toleranceCm : null,
  );
}
