import { Service, inject } from '@angular/core';

import { CustomerDetailsRequest } from '@core/orders/customer-details';
import { storeImageUrl } from '@core/supabase/store-image-url';
import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap } from '@shared/data-access/supabase-result';
import { CartVariant } from '../models/cart-item';
import { toCartVariant } from '../models/cart-variant.mapper';

export interface PendingPayment {
  readonly code: string;
  readonly variantIds: ReadonlySet<number>;
}

export interface OrderItemRequest {
  readonly variant_id: number;
  readonly quantity: number;
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

  /**
   * @description Creates the pending order and holds its items for the reservation minutes. The database
   * locks the items, so a piece is never held by two orders
   * @returns The order code
   */
  async reserveOrder(
    items: readonly OrderItemRequest[],
    details: CustomerDetailsRequest,
  ): Promise<string> {
    const rpcItems = items.map(({ variant_id, quantity }) => ({ variant_id, quantity }));
    const order = unwrap(await this.supabase.rpc('reserve_order', { items: rpcItems, ...details }));
    return order.code;
  }

  /**
   * @description Only for a customer who already has a session. The latest order still waiting for
   * payment within its reservation, or null
   */
  async findPendingPayment(): Promise<PendingPayment | null> {
    const [order] = unwrap(await this.supabase.rpc('my_checkout_order', {}));
    if (order?.status !== 'pending_payment' || (order.seconds_left ?? 0) <= 0) {
      return null;
    }

    const items = unwrap(
      await this.supabase.from('order_items').select('variant_id').eq('order_id', order.id),
    );
    return { code: order.code, variantIds: new Set(items.map((item) => item.variant_id)) };
  }
}
