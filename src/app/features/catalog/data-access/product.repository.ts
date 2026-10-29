import { Service, inject } from '@angular/core';

import { storeImageUrl } from '@core/supabase/store-image-url';
import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap, unwrapNullable } from '@shared/data-access/supabase-result';
import { ProductLookup, ProductSummary } from '../models/product';
import { PhotoUrl, toProductLookup, toProductSummary } from '../models/product.mapper';

export interface ProductQuery {
  readonly petType: string | null;
  readonly category: string | null;
  readonly sizeId: number | null;
}

const SUMMARY_COLUMNS =
  'slug, name, price, catalog_status, product_photos(storage_path, alt_text, sort_order)';

const CATALOG_COLUMNS =
  `${SUMMARY_COLUMNS}, pet_types!inner(slug), categories!inner(slug)` as const;

const DETAIL_COLUMNS = `${SUMMARY_COLUMNS}, description, pet_types(name), categories(name),
  catalog_variants(id, size_id, stock, available_stock, neck_cm, chest_cm, back_length_cm, tolerance_cm,
    sizes(label, sort_order))` as const;

@Service()
export class ProductRepository {
  private readonly supabase = inject(SUPABASE);
  private readonly photoUrl: PhotoUrl = (path) => storeImageUrl(this.supabase, path);

  /**
   * @description Lists the catalog where old out products are hidden. catalog_status is declared in display order, so reserved ones come last
   * @param query
   * @returns @type ProductSummary[]
   */
  async listForCatalog(query: ProductQuery): Promise<ProductSummary[]> {
    let request = this.supabase
      .from('catalog_products')
      .select(CATALOG_COLUMNS)
      .neq('catalog_status', 'sold_out');

    if (query.petType) {
      request = request.eq('pet_types.slug', query.petType);
    }
    if (query.category) {
      request = request.eq('categories.slug', query.category);
    }
    if (query.sizeId !== null) {
      request = request.contains('size_ids', [query.sizeId]);
    }

    const rows = unwrap(
      await request
        .order('catalog_status')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .order('sort_order', { referencedTable: 'product_photos' })
        .limit(1, { referencedTable: 'product_photos' }),
    );

    return rows.map((row) => toProductSummary(row, this.photoUrl));
  }

  async findBySlug(slug: string): Promise<ProductLookup> {
    const row = unwrapNullable(
      await this.supabase
        .from('catalog_products')
        .select(DETAIL_COLUMNS)
        .eq('slug', slug)
        .maybeSingle(),
    );

    return toProductLookup(row, this.photoUrl);
  }
}
