import { TestBed } from '@angular/core/testing';

import { SUPABASE } from '@core/supabase/supabase.client';
import { AccountOrderRepository } from './account-order.repository';

describe('AccountOrderRepository', () => {
  it('asks only for the orders of the customer, because admins can read every order', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select: () => ({ eq }) }));
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE, useValue: { from } }] });

    await TestBed.inject(AccountOrderRepository).listOrders('user-1');

    expect(from).toHaveBeenCalledWith('orders');
    expect(eq).toHaveBeenCalledWith('customer_id', 'user-1');
  });
});
