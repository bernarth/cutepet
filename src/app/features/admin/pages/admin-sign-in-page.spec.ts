import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { AdminSignInPage } from './admin-sign-in-page';

async function setup(
  queryParams: Record<string, string>,
  session = { signedIn: false, admin: false },
) {
  const auth = {
    ready: Promise.resolve(),
    isAdmin: signal(session.admin),
    isSignedIn: signal(session.signedIn),
    user: signal(null),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: auth },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(AdminSignInPage);
  await fixture.whenStable();
  return { auth, element: fixture.nativeElement as HTMLElement };
}

describe('AdminSignInPage', () => {
  it('returns to the requested page after signing in', async () => {
    const { auth, element } = await setup({ volver: '/admin/pedidos/CP-1' });

    element.querySelector('button')?.click();

    expect(auth.signInWithGoogle).toHaveBeenCalledWith('/admin/pedidos/CP-1');
  });

  it('returns to the panel home when the requested page is not in the panel', async () => {
    const { auth, element } = await setup({ volver: '//evil.example/admin' });

    element.querySelector('button')?.click();

    expect(auth.signInWithGoogle).toHaveBeenCalledWith('/admin');
  });

  it('keeps the requested page when changing account', async () => {
    const { auth, element } = await setup(
      { volver: '/admin/pedidos/CP-1' },
      { signedIn: true, admin: false },
    );

    element.querySelector('button')?.click();

    await vi.waitFor(() =>
      expect(auth.signInWithGoogle).toHaveBeenCalledWith('/admin/pedidos/CP-1'),
    );
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it('links to the requested page when the admin is already signed in', async () => {
    const { element } = await setup(
      { volver: '/admin/pedidos/CP-1' },
      { signedIn: true, admin: true },
    );

    expect(element.querySelector('a')?.getAttribute('href')).toBe('/admin/pedidos/CP-1');
  });
});
