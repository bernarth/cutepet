import { Service, inject } from '@angular/core';

import { PickupRule } from '@core/cart/cart-summary';
import { storeImageUrl } from '@core/supabase/store-image-url';
import { SUPABASE } from '@core/supabase/supabase.client';
import { AppError, unwrap } from '@shared/data-access/supabase-result';
import { CartVariant } from '../models/cart-item';
import { toCartVariant } from '../models/cart-variant.mapper';

export interface CartSettings {
  readonly storeWhatsapp: string | null;
  readonly pickupRule: PickupRule;
}

const VARIANT_COLUMNS = `id, stock, available_stock, neck_cm, chest_cm, back_length_cm,
  products!inner(name, slug, price, product_photos(storage_path, alt_text, sort_order))` as const;

@Service()
export class CartRepository {
  private readonly supabase = inject(SUPABASE);

  /**
   * @description Pieces of inactive products are hidden by RLS, so they never come back
   */
  async findVariants(variantIds: readonly number[]): Promise<CartVariant[]> {
    if (variantIds.length === 0) {
      return [];
    }

    const rows = unwrap(
      await this.supabase.from('catalog_variants').select(VARIANT_COLUMNS).in('id', variantIds),
    );

    return rows.map((row) => toCartVariant(row, (path) => storeImageUrl(this.supabase, path)));
  }

  async getSettings(): Promise<CartSettings> {
    const [settings] = unwrap(
      await this.supabase
        .from('settings')
        .select('store_whatsapp, pickup_fee, free_pickup_min_items')
        .limit(1),
    );

    if (!settings) {
      throw new AppError('Faltan los ajustes de la tienda', 'NOT_FOUND');
    }

    return {
      storeWhatsapp: settings.store_whatsapp,
      pickupRule: { fee: settings.pickup_fee, freeFromUnits: settings.free_pickup_min_items },
    };
  }
}
