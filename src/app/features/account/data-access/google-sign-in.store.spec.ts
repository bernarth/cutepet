import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { SignInAttempt, SignInAttemptStorage } from '@core/auth/sign-in-attempt';
import { AccountOrderRepository } from './account-order.repository';
import { GoogleSignInStore } from './google-sign-in.store';

const EXISTS = { error: 'server_error', error_code: 'identity_already_exists' };
const CANCELLED = { error: 'access_denied' };
const TRANSFER: SignInAttempt = { kind: 'transferring', transferToken: 'old', orderCodes: [] };

function setup(attempt: SignInAttempt | null, session: 'guest' | 'none' = 'guest') {
  sessionStorage.clear();
  const auth = {
    ready: Promise.resolve(),
    user: signal(session === 'guest' ? { id: 'guest-1' } : null),
    isGuest: signal(true),
    isSignedIn: signal(false),
    completeSignIn: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    linkGoogle: vi.fn().mockResolvedValue(undefined),
    signInToTransfer: vi.fn().mockResolvedValue(undefined),
  };
  const repository = {
    startGuestTransfer: vi.fn().mockResolvedValue('token'),
    listOrders: vi.fn().mockResolvedValue([{ code: 'CP1' }]),
  };
  TestBed.configureTestingModule({
    providers: [
      GoogleSignInStore,
      { provide: AuthStore, useValue: auth },
      { provide: AccountOrderRepository, useValue: repository },
    ],
  });
  const attempts = TestBed.inject(SignInAttemptStorage);
  if (attempt) {
    attempts.save(attempt);
  }

  return { auth, repository, attempts, store: TestBed.inject(GoogleSignInStore) };
}

const query = (params: Record<string, string>) => convertToParamMap(params);

describe('GoogleSignInStore', () => {
  it('forgets a finished sign-in but keeps the transfer for the account page', async () => {
    const linked = setup({ kind: 'linking' });
    expect(await linked.store.finish(query({ code: 'abc' }))).toBe(true);
    expect(linked.attempts.read()).toBeNull();

    TestBed.resetTestingModule();
    const transferring = setup(TRANSFER);
    expect(await transferring.store.finish(query({ code: 'abc' }))).toBe(true);
    expect(transferring.attempts.read()).toEqual(TRANSFER);
  });

  it('signs in by itself when the account of a guest who agreed already exists', async () => {
    const { auth, store } = setup({ kind: 'linking' });

    expect(await store.finish(query(EXISTS))).toBe(false);
    expect(auth.signInToTransfer).toHaveBeenCalledExactlyOnceWith(
      '/mi-cuenta',
      { kind: 'transferring', transferToken: 'token', orderCodes: ['CP1'] },
      false,
    );
    expect(store.message()).toBeNull();
  });

  it.each([TRANSFER, { kind: 'signing_in' } as const, null])(
    'never signs in by itself a second time or without the agreement: %j',
    async (attempt) => {
      const { auth, repository, store } = setup(attempt);
      await store.finish(query(EXISTS));

      expect(auth.signInToTransfer).not.toHaveBeenCalled();
      expect(repository.startGuestTransfer).not.toHaveBeenCalled();
      expect(store.message()).toContain('ya existe');
      expect(store.retryLabel()).toBe('Ingresar y guardar mis pedidos');
    },
  );

  it('does not sign in by itself without a guest session', async () => {
    const { auth, store } = setup({ kind: 'linking' }, 'none');
    await store.finish(query(EXISTS));

    expect(auth.signInToTransfer).not.toHaveBeenCalled();
  });

  it('asks again with a new token and the account picker when the second trip failed', async () => {
    const { auth, store } = setup(TRANSFER);
    await store.finish(query(CANCELLED));
    expect(store.message()).toContain('no pudimos ingresar');

    await store.retry('/mi-cuenta');
    expect(auth.signInToTransfer).toHaveBeenCalledWith(
      '/mi-cuenta',
      expect.objectContaining({ transferToken: 'token' }),
      true,
    );
  });

  it('explains when the automatic trip could not start', async () => {
    const { repository, store } = setup({ kind: 'linking' });
    repository.startGuestTransfer.mockRejectedValue(new TypeError('Failed to fetch'));
    await store.finish(query(EXISTS));

    expect(store.message()).toContain('no pudimos ingresar');
    expect(store.retryLabel()).toBe('Ingresar y guardar mis pedidos');
    expect(store.isWorking()).toBe(false);
  });

  it('links again after a cancelled link, so the orders are not left behind', async () => {
    const { auth, store } = setup({ kind: 'linking' });
    await store.finish(query(CANCELLED));
    expect(store.message()).toContain('Cancelaste');

    await store.retry('/mi-cuenta');
    expect(auth.linkGoogle).toHaveBeenCalledWith('/mi-cuenta');
    expect(auth.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('never offers a plain sign-in to a guest outside the panel', async () => {
    const { store } = setup(null);
    await store.finish(query(CANCELLED));

    expect(store.retryLabel()).toBeNull();
  });

  it('lets an admin with a guest session sign in to the panel', async () => {
    const { auth, store } = setup({ kind: 'signing_in' });
    await store.finish(query({ ...CANCELLED, volver: '/admin/pedidos' }));
    await store.retry('/admin/pedidos');

    expect(auth.signInWithGoogle).toHaveBeenCalledWith('/admin/pedidos');
  });

  it('can be used again when the person comes back from Google without signing in', async () => {
    const { store } = setup({ kind: 'linking' });
    await store.finish(query(EXISTS));
    expect(store.isWorking()).toBe(true);

    store.resume('/mi-cuenta');
    expect(store.isWorking()).toBe(false);
    expect(store.retryLabel()).not.toBeNull();
  });
});
