import { Service, inject } from '@angular/core';

import { storeImageUrl } from '@core/supabase/store-image-url';
import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap } from '@shared/data-access/supabase-result';
import { QuickSaleRequest, SaleProduct } from '../models/quick-sale';

const SALE_COLUMNS = `id, name, price,
  catalog_variants(id, available_stock, sizes(label, sort_order)),
  product_photos(storage_path)` as const;

export interface RecordedSale {
  readonly code: string;
  readonly itemsTotal: number;
}

@Service()
export class QuickSaleRepository {
  private readonly supabase = inject(SUPABASE);

  /**
   * @description Active products with at least one size that can be sold now
   */
  async listSaleProducts(): Promise<SaleProduct[]> {
    const rows = unwrap(
      await this.supabase
        .from('products')
        .select(SALE_COLUMNS)
        .eq('is_active', true)
        .order('name')
        .order('sort_order', { referencedTable: 'product_photos' })
        .limit(1, { referencedTable: 'product_photos' }),
    );

    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        price: row.price,
        photoUrl: row.product_photos[0]
          ? storeImageUrl(this.supabase, row.product_photos[0].storage_path)
          : null,
        options: row.catalog_variants
          .filter((variant) => (variant.available_stock ?? 0) > 0 && variant.id !== null)
          .sort((a, b) => (a.sizes?.sort_order ?? 0) - (b.sizes?.sort_order ?? 0))
          .map((variant) => ({
            variantId: variant.id ?? 0,
            productName: row.name,
            sizeLabel: variant.sizes?.label ?? '',
            unitPrice: row.price,
            available: variant.available_stock ?? 0,
          })),
      }))
      .filter((product) => product.options.length > 0);
  }

  /**
   * @description Records the WhatsApp sale as a confirmed order. The database locks the items and never sells one twice
   */
  async createQuickSale(request: QuickSaleRequest): Promise<RecordedSale> {
    const order = unwrap(await this.supabase.rpc('create_quick_sale', { ...request }));
    return { code: order.code, itemsTotal: order.items_total };
  }
}
