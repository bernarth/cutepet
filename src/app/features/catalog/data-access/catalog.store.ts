import { Service, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import {
  AVAILABILITY_OPTIONS,
  CatalogFilterKey,
  FILTER_PARAMS,
  FilterGroup,
  filterParamValues,
  filtersFromParams,
} from '../models/catalog-filters';
import { LookupRepository } from './lookup.repository';
import { ProductRepository } from './product.repository';

/** Provided by CatalogPage. The URL query params are the source of truth for the filters */
@Service({ autoProvided: false })
export class CatalogStore {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly products = inject(ProductRepository);
  private readonly lookups = inject(LookupRepository);

  private readonly queryParams = toSignal(this.route.queryParams, {
    initialValue: this.route.snapshot.queryParams,
  });

  readonly filters = computed(() => filtersFromParams(this.queryParams()));
  readonly selectedValues = computed(() => filterParamValues(this.filters()));
  readonly hasFilters = computed(() =>
    Object.values(this.selectedValues()).some((value) => value !== null),
  );

  private readonly options = resource({
    id: 'catalog-filter-options',
    loader: async () => {
      const [petTypes, categories, sizes] = await Promise.all([
        this.lookups.listPetTypes(),
        this.lookups.listCatalogCategories(),
        this.lookups.listActiveSizes(),
      ]);
      return { petTypes, categories, sizes };
    },
  });

  private readonly productList = resource({
    id: 'catalog-products',
    params: ({ chain }) => ({ filters: this.filters(), sizes: chain(this.options)?.sizes ?? [] }),
    loader: ({ params: { filters, sizes } }) =>
      this.products.listForCatalog({
        petType: filters.petType,
        category: filters.category,
        sizeId: sizes.find((size) => size.label === filters.size)?.id ?? null,
        availability: filters.availability,
      }),
  });

  readonly items = computed(() => (this.productList.hasValue() ? this.productList.value() : []));
  readonly isLoading = computed(() => this.productList.isLoading());
  readonly hasError = computed(() => this.productList.status() === 'error');

  readonly filterGroups = computed<FilterGroup[]>(() => {
    const options = this.options.hasValue() ? this.options.value() : null;
    return [
      { key: 'petType', label: 'Mascota', options: options?.petTypes ?? [] },
      { key: 'category', label: 'Categoría', options: options?.categories ?? [] },
      {
        key: 'size',
        label: 'Talla',
        options: (options?.sizes ?? []).map((size) => ({ value: size.label, label: size.label })),
      },
      { key: 'availability', label: 'Disponibilidad', options: AVAILABILITY_OPTIONS },
    ];
  });

  setFilter(key: CatalogFilterKey, value: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [FILTER_PARAMS[key]]: value },
      queryParamsHandling: 'merge',
    });
  }

  clearFilters(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  reload(): void {
    this.productList.reload();
  }
}
