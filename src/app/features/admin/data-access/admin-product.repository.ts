import { Service, inject } from '@angular/core';

import { Size, toSize } from '@core/catalog/size';
import { storeImageUrl } from '@core/supabase/store-image-url';
import { TablesInsert } from '@core/supabase/database.types';
import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap, unwrapNullable } from '@shared/data-access/supabase-result';
import { AdminProduct, AdminProductSummary, LookupOption } from '../models/admin-product';
import { toAdminProduct, toAdminProductSummary } from '../models/admin-product.mapper';
import { ProductInput } from '../models/product-form';
import { VariantFormModel } from '../models/variant-form';

const SUMMARY_COLUMNS =
  'id, name, price, is_active, catalog_variants(stock, available_stock), product_photos(storage_path)';

const DETAIL_COLUMNS = `id, name, slug, description, pet_type_id, category_id, price, is_active,
  catalog_variants(id, size_id, stock, available_stock, neck_cm, chest_cm, back_length_cm, tolerance_cm,
    sizes(label, sort_order), order_items(count)),
  product_photos(id, storage_path, alt_text, sort_order)` as const;

export interface AdminSize extends Size {
  readonly active: boolean;
}

export interface CatalogLookups {
  readonly petTypes: readonly LookupOption[];
  readonly categories: readonly LookupOption[];
  readonly sizes: readonly AdminSize[];
}

/**
 * @description Products and their sizes as the admin sees them, archived and sold out included (RLS lets admins read them)
 */
@Service()
export class AdminProductRepository {
  private readonly supabase = inject(SUPABASE);

  async listProducts(): Promise<AdminProductSummary[]> {
    const rows = unwrap(
      await this.supabase
        .from('products')
        .select(SUMMARY_COLUMNS)
        .order('created_at', { ascending: false })
        .order('sort_order', { referencedTable: 'product_photos' })
        .limit(1, { referencedTable: 'product_photos' }),
    );

    return rows.map((row) =>
      toAdminProductSummary(row, (path) => storeImageUrl(this.supabase, path)),
    );
  }

  async getProduct(id: number): Promise<AdminProduct | null> {
    const row = unwrapNullable(
      await this.supabase.from('products').select(DETAIL_COLUMNS).eq('id', id).maybeSingle(),
    );

    return row ? toAdminProduct(row, (path) => storeImageUrl(this.supabase, path)) : null;
  }

  async listLookups(): Promise<CatalogLookups> {
    const [petTypes, categories, sizes] = await Promise.all([
      this.supabase.from('pet_types').select('id, name, active').order('sort_order'),
      this.supabase.from('categories').select('id, name, active').order('sort_order'),
      this.supabase.from('sizes').select('*').order('sort_order'),
    ]);

    return {
      petTypes: unwrap(petTypes),
      categories: unwrap(categories),
      sizes: unwrap(sizes).map((row) => ({ ...toSize(row), active: row.active })),
    };
  }

  async createProduct(input: ProductInput, slug: string): Promise<number> {
    const { id } = unwrap<{ id: number }>(
      await this.supabase
        .from('products')
        .insert({ ...toProductColumns(input), slug })
        .select('id')
        .single(),
    );

    return id;
  }

  async updateProduct(id: number, input: ProductInput): Promise<void> {
    unwrapNullable(
      await this.supabase.from('products').update(toProductColumns(input)).eq('id', id),
    );
  }

  async updateSlug(id: number, slug: string): Promise<void> {
    unwrapNullable(await this.supabase.from('products').update({ slug }).eq('id', id));
  }

  async setActive(id: number, isActive: boolean): Promise<void> {
    unwrapNullable(
      await this.supabase.from('products').update({ is_active: isActive }).eq('id', id),
    );
  }

  async createVariant(productId: number, model: VariantFormModel): Promise<void> {
    unwrapNullable(
      await this.supabase.from('variants').insert({
        ...toVariantColumns(model),
        product_id: productId,
        stock: model.stock ?? 0,
      }),
    );
  }

  async updateVariant(id: number, model: VariantFormModel): Promise<void> {
    unwrapNullable(
      await this.supabase.from('variants').update(toVariantColumns(model)).eq('id', id),
    );
  }

  async adjustStock(variantId: number, newStock: number, reason: string): Promise<void> {
    unwrap(
      await this.supabase.rpc('adjust_stock', {
        variant_id: variantId,
        new_stock: newStock,
        reason: reason.trim(),
      }),
    );
  }
}

function toProductColumns(input: ProductInput): Omit<TablesInsert<'products'>, 'slug'> {
  return {
    name: input.name,
    description: input.description,
    pet_type_id: input.petTypeId,
    category_id: input.categoryId,
    price: input.price,
  };
}

function toVariantColumns(
  model: VariantFormModel,
): Omit<TablesInsert<'variants'>, 'product_id' | 'stock'> {
  if (model.sizeId === null) {
    throw new Error('Falta la talla');
  }

  return {
    size_id: model.sizeId,
    neck_cm: model.neckCm,
    chest_cm: model.chestCm,
    back_length_cm: model.backLengthCm,
    tolerance_cm: model.toleranceCm,
  };
}
