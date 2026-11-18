import { Service, computed, inject, resource, signal } from '@angular/core';

import { AdminVariant } from '../models/admin-product';
import { ProductFormModel, toProductInput } from '../models/product-form';
import { slugify } from '../models/slugify';
import { VariantFormModel } from '../models/variant-form';
import { AdminProductRepository, CatalogLookups } from './admin-product.repository';

const NO_LOOKUPS: CatalogLookups = { petTypes: [], categories: [], sizes: [] };

/**
 * @description One product in the panel: its data, sizes and stock, plus the lists its form needs
 */
@Service()
export class AdminProductStore {
  private readonly repository = inject(AdminProductRepository);
  private readonly productId = signal<number | null>(null);

  private readonly productResource = resource({
    params: () => this.productId() ?? undefined,
    loader: ({ params: id }) => this.repository.getProduct(id),
  });
  private readonly lookupsResource = resource({ loader: () => this.repository.listLookups() });

  readonly product = computed(() => this.productResource.value() ?? null);
  readonly isLoading = computed(
    () => this.productResource.isLoading() || this.lookupsResource.isLoading(),
  );
  readonly hasError = computed(
    () => this.productResource.error() !== undefined || this.lookupsResource.error() !== undefined,
  );
  readonly notFound = computed(
    () => this.productResource.status() === 'resolved' && this.productResource.value() === null,
  );
  readonly lookups = computed(() => this.lookupsResource.value() ?? NO_LOOKUPS);

  load(id: number): void {
    this.productId.set(id);
  }

  /**
   * @description The slug comes from the name and is locked afterwards
   * @returns The new product id
   */
  async createProduct(model: ProductFormModel): Promise<number> {
    const input = toProductInput(model);
    return this.repository.createProduct(input, slugify(input.name));
  }

  async saveProduct(model: ProductFormModel): Promise<void> {
    await this.repository.updateProduct(this.requireId(), toProductInput(model));
    this.productResource.reload();
  }

  async changeSlug(slug: string): Promise<void> {
    await this.repository.updateSlug(this.requireId(), slug.trim());
    this.productResource.reload();
  }

  async setActive(isActive: boolean): Promise<void> {
    await this.repository.setActive(this.requireId(), isActive);
    this.productResource.reload();
  }

  async saveVariant(variant: AdminVariant | null, model: VariantFormModel): Promise<void> {
    if (variant) {
      await this.repository.updateVariant(variant.id, model);
    } else {
      await this.repository.createVariant(this.requireId(), model);
    }
    this.productResource.reload();
  }

  async adjustStock(variant: AdminVariant, newStock: number, reason: string): Promise<void> {
    await this.repository.adjustStock(variant.id, newStock, reason);
    this.productResource.reload();
  }

  private requireId(): number {
    const id = this.productId();

    if (id === null) {
      throw new Error('No hay una prenda cargada');
    }

    return id;
  }
}
