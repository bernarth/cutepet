import { TestBed } from '@angular/core/testing';

import { SUPABASE } from '@core/supabase/supabase.client';
import { AuthStore } from './auth.store';

function setup() {
  const session = { access_token: 'x', user: { id: '1', is_anonymous: false } };
  const auth = {
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'x' }, error: null }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
  TestBed.configureTestingModule({ providers: [{ provide: SUPABASE, useValue: { auth } }] });

  return { auth, store: TestBed.inject(AuthStore) };
}

describe('AuthStore', () => {
  it('asks Google to come back to the callback page with the return path', async () => {
    const { auth, store } = setup();
    await store.signInWithGoogle('/admin/pedidos/CP-1');

    const { redirectTo } = auth.signInWithOAuth.mock.calls[0][0].options;
    expect(redirectTo).toBe(`${location.origin}/ingresar/google?volver=%2Fadmin%2Fpedidos%2FCP-1`);
  });

  it('has the session as soon as the code is exchanged', async () => {
    const { store } = setup();
    await store.ready;
    await store.completeSignIn('abc');

    expect(store.isSignedIn()).toBe(true);
  });

  it('keeps the error code when the exchange fails', async () => {
    const { auth, store } = setup();
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'x', code: 'bad_code_verifier' },
    });

    await expect(store.completeSignIn('abc')).rejects.toMatchObject({ code: 'bad_code_verifier' });
    expect(store.isSignedIn()).toBe(false);
  });

  it('signs out only on this device', async () => {
    const { auth, store } = setup();
    await store.signOut();

    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
