import { Service, computed, inject, resource, signal } from '@angular/core';

import { AdminPhoto, AdminProduct, AdminVariant } from '../models/admin-product';
import { compressPhoto } from '../models/photo-compression';
import { movePhoto, nextSortOrder } from '../models/photo-order';
import { ProductFormModel, toProductInput } from '../models/product-form';
import { slugify } from '../models/slugify';
import { VariantFormModel } from '../models/variant-form';
import { AdminPhotoRepository } from './admin-photo.repository';
import { AdminProductRepository, CatalogLookups } from './admin-product.repository';

const NO_LOOKUPS: CatalogLookups = { petTypes: [], categories: [], sizes: [] };

/**
 * @description One product in the panel: its data, sizes and stock, plus the lists its form needs
 */
@Service()
export class AdminProductStore {
  private readonly repository = inject(AdminProductRepository);
  private readonly photoRepository = inject(AdminPhotoRepository);
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

  /**
   * @description Compresses and uploads the photos one by one, after the current last photo
   * @param onUploaded Called with how many photos are already uploaded
   */
  async addPhotos(files: readonly Blob[], onUploaded: (count: number) => void): Promise<void> {
    const product = this.requireProduct();
    let sortOrder = nextSortOrder(product.photos);

    try {
      for (const [index, file] of files.entries()) {
        await this.photoRepository.addPhoto({
          productId: product.id,
          file: await compressPhoto(file),
          alt: `${product.name} foto ${sortOrder}`,
          sortOrder,
        });
        sortOrder++;
        onUploaded(index + 1);
      }
    } finally {
      this.productResource.reload();
    }
  }

  async deletePhoto(photo: AdminPhoto): Promise<void> {
    await this.photoRepository.deletePhoto(photo);
    this.productResource.reload();
  }

  /**
   * @param targetIndex 0 makes it the cover
   */
  async movePhoto(photo: AdminPhoto, targetIndex: number): Promise<void> {
    const positions = movePhoto(this.requireProduct().photos, photo.id, targetIndex);
    await this.photoRepository.savePositions(positions);
    this.productResource.reload();
  }

  async updatePhotoAlt(photo: AdminPhoto, alt: string): Promise<void> {
    await this.photoRepository.updateAlt(photo.id, alt.trim());
    this.productResource.reload();
  }

  private requireProduct(): AdminProduct {
    const product = this.product();

    if (!product) {
      throw new Error('No hay una prenda cargada');
    }

    return product;
  }

  private requireId(): number {
    const id = this.productId();

    if (id === null) {
      throw new Error('No hay una prenda cargada');
    }

    return id;
  }
}
