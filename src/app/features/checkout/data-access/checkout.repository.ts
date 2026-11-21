import { Service, inject } from '@angular/core';

import { storeImageUrl } from '@core/supabase/store-image-url';
import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap } from '@shared/data-access/supabase-result';
import { CheckoutOrder, toCheckoutOrder } from '../models/checkout-order';
import { proofPath } from '../models/payment-proof';

@Service()
export class CheckoutRepository {
  private readonly supabase = inject(SUPABASE);

  /**
   * @description The database first expires late reservations, so the status is always current.
   * Without a code it returns the latest pending or expired order of this customer
   */
  async findOrder(code: string | null): Promise<CheckoutOrder | null> {
    const rows = unwrap(
      await this.supabase.rpc('my_checkout_order', code ? { order_code: code } : {}),
    );
    return rows.length > 0 ? toCheckoutOrder(rows[0]) : null;
  }

  qrImageUrl(storagePath: string): string {
    return storeImageUrl(this.supabase, storagePath);
  }

  /**
   * @description A file left by a failed call stays in storage. Customers can upload but never delete
   */
  async submitProof(orderId: string, file: Blob): Promise<void> {
    const path = proofPath(orderId, file.type, crypto.randomUUID());

    unwrap(
      await this.supabase.storage
        .from('payment-proofs')
        .upload(path, file, { contentType: file.type }),
    );
    unwrap(
      await this.supabase.rpc('submit_payment_proof', { order_id: orderId, proof_path: path }),
    );
  }

  async orderVariantIds(orderId: string): Promise<number[]> {
    const rows = unwrap(
      await this.supabase.from('order_items').select('variant_id').eq('order_id', orderId),
    );
    return rows.map((row) => row.variant_id);
  }

  async cancelOrder(orderId: string): Promise<void> {
    unwrap(await this.supabase.rpc('cancel_order', { order_id: orderId }));
  }
}
