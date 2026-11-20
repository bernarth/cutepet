import { Service, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { SettingsRepository } from '@core/settings/settings.repository';
import { LookupRepository } from './lookup.repository';
import { ProductRepository } from './product.repository';

/**
 * @description Provided by ProductPage. Reads the slug from the route
 */
@Service({ autoProvided: false })
export class ProductStore {
  private readonly route = inject(ActivatedRoute);
  private readonly products = inject(ProductRepository);
  private readonly lookups = inject(LookupRepository);
  private readonly settings = inject(SettingsRepository);

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
      const [sizes, settings] = await Promise.all([
        this.lookups.listAllSizes(),
        this.settings.getStoreSettings(),
      ]);

      return { sizes, toleranceCm: settings.sizeToleranceCm };
    },
  });

  private readonly lookup = computed(() =>
    this.productResource.hasValue() ? this.productResource.value() : null,
  );

  readonly product = computed(() => {
    const lookup = this.lookup();

    return lookup?.kind === 'found' ? lookup.product : null;
  });
  readonly isSoldOut = computed(() => this.lookup()?.kind === 'sold_out');
  readonly notFound = computed(() => this.lookup()?.kind === 'not_found');
  readonly isLoading = computed(() => this.productResource.isLoading());
  readonly hasError = computed(() => this.productResource.status() === 'error');

  readonly sizes = computed(() => (this.sizing.hasValue() ? this.sizing.value().sizes : []));
  readonly toleranceCm = computed(() =>
    this.sizing.hasValue() ? this.sizing.value().toleranceCm : null,
  );
}
