import { Service, inject } from '@angular/core';

import { SUPABASE } from '@core/supabase/supabase.client';
import { AppError, unwrap, unwrapNullable } from '@shared/data-access/supabase-result';
import { AdminOrder, AdminOrderSummary, OrderListFilter, PickupInfo } from '../models/admin-order';
import { toAdminOrder, toAdminOrderSummary } from '../models/admin-order.mapper';

const SUMMARY_COLUMNS = `id, code, status, needs_attention, channel, customer_name, customer_phone,
  delivery_method, items_total, created_at, order_items(quantity)` as const;

const DETAIL_COLUMNS =
  `*, order_items(quantity, unit_price, product_name, variants(sizes(label)))` as const;

/** Signed links to private files last 5 minutes, enough to look at a proof */
const SIGNED_URL_SECONDS = 300;

export type PrivateBucket = 'payment-proofs' | 'shipping-receipts';

export interface OrderQuery {
  readonly filter: OrderListFilter;
  readonly search: string;
  readonly limit: number;
}

@Service()
export class AdminOrderRepository {
  private readonly supabase = inject(SUPABASE);

  /**
   * @description Flagged orders come first, then the newest. A search looks in every status
   */
  async listOrders(query: OrderQuery): Promise<AdminOrderSummary[]> {
    let request = this.supabase.from('orders').select(SUMMARY_COLUMNS);
    const search = searchTerm(query.search);

    if (search) {
      request = request.or(
        `code.ilike.*${search}*,customer_phone.ilike.*${search}*,customer_name.ilike.*${search}*`,
      );
    } else if (query.filter === 'to_review') {
      request = request.eq('status', 'proof_uploaded');
    } else if (query.filter !== 'all') {
      request = request.eq('status', query.filter);
    }

    const rows = unwrap(
      await request
        .order('needs_attention', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(query.limit),
    );

    return rows.map(toAdminOrderSummary);
  }

  async countToReview(): Promise<number> {
    const response = await this.supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'proof_uploaded');

    unwrapNullable(response);
    return response.count ?? 0;
  }

  async getOrder(code: string): Promise<AdminOrder | null> {
    const row = unwrapNullable(
      await this.supabase.from('orders').select(DETAIL_COLUMNS).eq('code', code).maybeSingle(),
    );

    return row ? toAdminOrder(row) : null;
  }

  async getPickupInfo(): Promise<PickupInfo> {
    const [settings] = unwrap(
      await this.supabase
        .from('settings')
        .select('pickup_address, pickup_hours, pickup_notice')
        .limit(1),
    );

    if (!settings) {
      throw new AppError('Faltan los ajustes de la tienda', 'NOT_FOUND');
    }

    return {
      address: settings.pickup_address,
      hours: settings.pickup_hours,
      notice: settings.pickup_notice,
    };
  }

  async confirm(orderId: string): Promise<void> {
    unwrap(await this.supabase.rpc('confirm_order', { order_id: orderId }));
  }

  async advance(orderId: string): Promise<void> {
    unwrap(await this.supabase.rpc('advance_order', { order_id: orderId }));
  }

  async cancel(orderId: string, reason: string): Promise<void> {
    unwrap(await this.supabase.rpc('cancel_order', { order_id: orderId, reason }));
  }

  async restore(orderId: string, reason: string): Promise<void> {
    unwrap(await this.supabase.rpc('restore_order', { order_id: orderId, reason }));
  }

  async revert(orderId: string, reason: string): Promise<void> {
    unwrap(await this.supabase.rpc('revert_order_status', { order_id: orderId, reason }));
  }

  /**
   * @description Private files are only shown through links that expire
   */
  async signedUrl(bucket: PrivateBucket, path: string): Promise<string> {
    const { signedUrl } = unwrap(
      await this.supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS),
    );
    return signedUrl;
  }

  /**
   * @description A replaced receipt stays in storage: admins can upload receipts but not delete them
   */
  async attachShippingReceipt(orderId: string, photo: Blob): Promise<void> {
    const path = `${orderId}/${crypto.randomUUID()}.jpg`;

    unwrap(
      await this.supabase.storage
        .from('shipping-receipts')
        .upload(path, photo, { contentType: 'image/jpeg' }),
    );
    unwrapNullable(
      await this.supabase.from('orders').update({ shipping_receipt_path: path }).eq('id', orderId),
    );
  }
}

/**
 * @description Keeps letters, digits and spaces so the text cannot break the PostgREST filter
 */
function searchTerm(text: string): string {
  return text.replace(/[^\p{L}\p{N} ]/gu, '').trim();
}
