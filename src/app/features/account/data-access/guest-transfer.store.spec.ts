import { TestBed } from '@angular/core/testing';

import { SignInAttempt, SignInAttemptStorage } from '@core/auth/sign-in-attempt';
import { AppError } from '@shared/data-access/supabase-result';
import { AccountOrderRepository } from './account-order.repository';
import { GuestTransferStore } from './guest-transfer.store';

const TRANSFER: SignInAttempt = {
  kind: 'transferring',
  transferToken: 'token',
  orderCodes: ['CP1', 'CP2'],
};

function setup(attempt: SignInAttempt | null, transferGuestOrders: ReturnType<typeof vi.fn>) {
  sessionStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      GuestTransferStore,
      { provide: AccountOrderRepository, useValue: { transferGuestOrders } },
    ],
  });
  const attempts = TestBed.inject(SignInAttemptStorage);
  if (attempt) {
    attempts.save(attempt);
  }

  return { store: TestBed.inject(GuestTransferStore), attempts };
}

describe('GuestTransferStore', () => {
  it('uses the token of this tab once', async () => {
    const transfer = vi.fn().mockResolvedValue({ outcome: 'moved', movedCount: 2 });
    const { store, attempts } = setup(TRANSFER, transfer);

    expect(await store.finish()).toBe(true);
    expect(transfer).toHaveBeenCalledExactlyOnceWith('token');
    expect(store.notice()?.kind).toBe('moved');
    expect(attempts.read()).toBeNull();
  });

  it.each([null, { kind: 'linking' }, { kind: 'signing_in' }] as const)(
    'sends no token without an agreed transfer: %j',
    async (attempt) => {
      const transfer = vi.fn().mockResolvedValue({ outcome: 'nothing', movedCount: 0 });
      const { store } = setup(attempt, transfer);

      expect(await store.finish()).toBe(false);
      expect(transfer).toHaveBeenCalledWith(null);
      expect(store.notice()).toBeNull();
    },
  );

  it('forgets the token of a pending conflict, because the account already holds the transfer', async () => {
    const transfer = vi.fn().mockResolvedValue({ outcome: 'pending_conflict', movedCount: 0 });
    const { store, attempts } = setup(TRANSFER, transfer);

    expect(await store.finish()).toBe(false);
    expect(store.notice()?.kind).toBe('pending_conflict');
    expect(attempts.read()).toBeNull();
  });

  it('keeps the order codes when the token is no longer valid', async () => {
    const transfer = vi.fn().mockRejectedValue(new AppError('TRANSFER_INVALID', 'P0001'));
    const { store, attempts } = setup(TRANSFER, transfer);
    await store.finish();

    expect(store.notice()?.kind).toBe('invalid');
    expect(store.lostOrderCodes()).toEqual(['CP1', 'CP2']);
    expect(attempts.read()).toBeNull();
  });

  it('keeps the token when the call fails, so it can be tried again', async () => {
    const transfer = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const { store, attempts } = setup(TRANSFER, transfer);
    await store.finish();

    expect(store.notice()?.kind).toBe('failed');
    expect(attempts.read()).toEqual(TRANSFER);
  });

  it('stays quiet when there was no transfer to finish', async () => {
    const { store } = setup(null, vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await store.finish();

    expect(store.notice()).toBeNull();
  });
});
