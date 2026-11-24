import { Service, inject } from '@angular/core';

import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap } from '@shared/data-access/supabase-result';
import { AccountOrder, toAccountOrder } from '../models/account-order';
import { TransferResult } from '../models/transfer-notice';

@Service()
export class AccountOrderRepository {
  private readonly supabase = inject(SUPABASE);

  /**
   * @description Admins can read every order, so the customer is always part of the query
   */
  async listOrders(customerId: string): Promise<AccountOrder[]> {
    const rows = unwrap(
      await this.supabase
        .from('orders')
        .select(
          'code, status, cancel_reason, items_total, created_at, order_items(product_name, quantity)',
        )
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
    );
    return rows.map(toAccountOrder);
  }

  /**
   * @returns A token that works once, for 24 hours, to take the orders of this guest to an account
   */
  async startGuestTransfer(): Promise<string> {
    return unwrap(await this.supabase.rpc('start_guest_transfer'));
  }

  /**
   * @description Without a token it finishes a transfer already tied to this account
   */
  async transferGuestOrders(transferToken: string | null): Promise<TransferResult> {
    const [row] = unwrap(
      await this.supabase.rpc(
        'transfer_guest_orders',
        transferToken ? { transfer_token: transferToken } : {},
      ),
    );
    return { outcome: row.outcome, movedCount: row.moved_count };
  }
}
