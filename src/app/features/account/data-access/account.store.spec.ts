import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthStore } from '@core/auth/auth.store';
import { SignInAttemptStorage } from '@core/auth/sign-in-attempt';
import { SettingsRepository } from '@core/settings/settings.repository';
import { AccountOrderRepository } from './account-order.repository';
import { AccountStore } from './account.store';
import { GuestTransferStore } from './guest-transfer.store';

type Session = 'none' | 'guest' | 'account';

async function setup(session: Session) {
  sessionStorage.clear();
  const auth = {
    ready: Promise.resolve(),
    user: signal(session === 'none' ? null : { id: 'user-1', email: 'ana@test.bo' }),
    isGuest: signal(session !== 'account'),
    isSignedIn: signal(session === 'account'),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    linkGoogle: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
  const repository = { listOrders: vi.fn().mockResolvedValue([{ code: 'CP1' }]) };
  const transfer = { finish: vi.fn().mockResolvedValue(true), lostOrderCodes: signal([]) };
  TestBed.configureTestingModule({
    providers: [
      AccountStore,
      { provide: AuthStore, useValue: auth },
      { provide: AccountOrderRepository, useValue: repository },
      { provide: GuestTransferStore, useValue: transfer },
      {
        provide: SettingsRepository,
        useValue: { getStoreSettings: vi.fn().mockResolvedValue({ storeWhatsapp: '71234567' }) },
      },
    ],
  });
  const store = TestBed.inject(AccountStore);
  await TestBed.tick();
  await vi.waitFor(() => expect(store.view()).not.toBe('loading'));

  return { auth, repository, transfer, store, attempts: TestBed.inject(SignInAttemptStorage) };
}

describe('AccountStore', () => {
  it('loads nothing and only signs in when there is no session', async () => {
    const { auth, repository, transfer, store } = await setup('none');
    await store.signIn();

    expect(store.view()).toBe('visitor');
    expect(repository.listOrders).not.toHaveBeenCalled();
    expect(transfer.finish).not.toHaveBeenCalled();
    expect(auth.signInWithGoogle).toHaveBeenCalledWith('/mi-cuenta');
  });

  it('shows a guest their orders before linking them', async () => {
    const { auth, transfer, store } = await setup('guest');
    expect(store.canKeepOrders()).toBe(false);
    await vi.waitFor(() => expect(store.canKeepOrders()).toBe(true));
    await store.signIn();

    expect(store.orders()).toEqual([{ code: 'CP1' }]);
    expect(auth.linkGoogle).toHaveBeenCalledWith('/mi-cuenta');
    expect(transfer.finish).not.toHaveBeenCalled();
  });

  it('drops the guest session first when the orders belong to someone else', async () => {
    const { auth, store } = await setup('guest');
    await store.signInWithoutOrders();

    expect(auth.signOut).toHaveBeenCalledBefore(auth.signInWithGoogle);
    expect(auth.linkGoogle).not.toHaveBeenCalled();
  });

  it('loads the orders of an account after its transfer, and again after a retry', async () => {
    const { repository, transfer, store } = await setup('account');
    await vi.waitFor(() => expect(store.orders()).toEqual([{ code: 'CP1' }]));

    expect(transfer.finish).toHaveBeenCalledBefore(repository.listOrders);
    expect(repository.listOrders).toHaveBeenCalledExactlyOnceWith('user-1');

    await store.finishTransfer();
    await vi.waitFor(() => expect(repository.listOrders).toHaveBeenCalledTimes(2));
  });

  it('helps a person who came back from Google without signing in', async () => {
    const { attempts, store } = await setup('guest');
    expect(store.showSignInHelp()).toBe(false);

    attempts.save({ kind: 'linking' });
    store.checkUnfinishedSignIn();
    expect(store.showSignInHelp()).toBe(true);
  });

  it('shows no help when Google could not be opened', async () => {
    const { auth, attempts, store } = await setup('guest');
    auth.linkGoogle.mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await store.signIn()).toBe(false);
    expect(attempts.read()).toBeNull();
    expect(store.isBusy()).toBe(false);
  });
});
