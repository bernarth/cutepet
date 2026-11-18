import { Service, computed, inject, resource } from '@angular/core';

import {
  LookupFormModel,
  LookupItem,
  LookupTable,
  SizeFormModel,
  SizeItem,
} from '../models/catalog-lists';
import { AdminProductStore } from './admin-product.store';
import { CatalogListsRepository, LookupRow, Usage } from './catalog-lists.repository';

const NO_USAGE: Usage = { categories: new Map(), petTypes: new Map(), sizes: new Map() };

@Service()
export class CatalogListsStore {
  private readonly repository = inject(CatalogListsRepository);
  private readonly productStore = inject(AdminProductStore);

  private readonly categoriesResource = resource({
    loader: () => this.repository.listLookup('categories'),
  });
  private readonly petTypesResource = resource({
    loader: () => this.repository.listLookup('pet_types'),
  });
  private readonly sizesResource = resource({ loader: () => this.repository.listSizes() });
  private readonly usageResource = resource({ loader: () => this.repository.usage() });

  private readonly usage = computed(() => this.usageResource.value() ?? NO_USAGE);

  readonly categories = computed(() =>
    withCounts(this.categoriesResource.value(), this.usage().categories),
  );
  readonly petTypes = computed(() =>
    withCounts(this.petTypesResource.value(), this.usage().petTypes),
  );
  readonly sizes = computed<SizeItem[]>(() =>
    (this.sizesResource.value() ?? []).map((size) => ({
      ...size,
      productCount: this.usage().sizes.get(size.id) ?? 0,
    })),
  );

  readonly isLoading = computed(
    () =>
      this.categoriesResource.isLoading() ||
      this.petTypesResource.isLoading() ||
      this.sizesResource.isLoading(),
  );
  readonly hasError = computed(
    () =>
      this.categoriesResource.error() !== undefined ||
      this.petTypesResource.error() !== undefined ||
      this.sizesResource.error() !== undefined,
  );

  items(table: LookupTable): LookupItem[] {
    return table === 'categories' ? this.categories() : this.petTypes();
  }

  reload(): void {
    this.categoriesResource.reload();
    this.petTypesResource.reload();
    this.sizesResource.reload();
    this.usageResource.reload();
  }

  async saveLookup(table: LookupTable, id: number | null, model: LookupFormModel): Promise<void> {
    await this.repository.saveLookup(table, id, model);
    this.afterLookupChange(table);
  }

  async setLookupActive(table: LookupTable, id: number, active: boolean): Promise<void> {
    await this.repository.setLookupActive(table, id, active);
    this.afterLookupChange(table);
  }

  async saveSize(id: number | null, model: SizeFormModel): Promise<void> {
    await this.repository.saveSize(id, model);
    this.afterSizeChange();
  }

  async setSizeActive(id: number, active: boolean): Promise<void> {
    await this.repository.setSizeActive(id, active);
    this.afterSizeChange();
  }

  /**
   * @description The product form reads these lists too, so it loads them again
   */
  private afterLookupChange(table: LookupTable): void {
    (table === 'categories' ? this.categoriesResource : this.petTypesResource).reload();
    this.productStore.reloadLookups();
  }

  private afterSizeChange(): void {
    this.sizesResource.reload();
    this.productStore.reloadLookups();
  }
}

function withCounts(
  rows: readonly LookupRow[] | undefined,
  counts: ReadonlyMap<number, number>,
): LookupItem[] {
  return (rows ?? []).map((row) => ({ ...row, productCount: counts.get(row.id) ?? 0 }));
}
