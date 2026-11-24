import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthStore } from '@core/auth/auth.store';
import { AppError } from '@shared/data-access/supabase-result';
import { AccountOrderRepository } from '../data-access/account-order.repository';
import { GoogleSignInPage } from './google-sign-in-page';

@Component({ template: 'blank' })
class BlankPage {}

async function visit(url: string, options: { error?: unknown; signedIn?: boolean } = {}) {
  const auth = {
    ready: Promise.resolve(),
    isSignedIn: signal(options.signedIn ?? false),
    user: signal(options.signedIn ? { email: 'ana@test.bo' } : null),
    isGuest: signal(!options.signedIn),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    completeSignIn: options.error
      ? vi.fn().mockRejectedValue(options.error)
      : vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'ingresar/google', component: GoogleSignInPage },
          { path: '**', component: BlankPage },
        ],
        withComponentInputBinding(),
      ),
      { provide: AuthStore, useValue: auth },
      { provide: AccountOrderRepository, useValue: {} },
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await harness.fixture.whenStable();
  const element = harness.fixture.nativeElement as HTMLElement;

  return { auth, element, router: TestBed.inject(Router) };
}

describe('GoogleSignInPage', () => {
  it('uses the code once and opens the requested page with a clean address', async () => {
    const { auth, router } = await visit(
      '/ingresar/google?code=abc&volver=%2Fadmin%2Fpedidos%2FCP-1',
    );

    await vi.waitFor(() => expect(router.url).toBe('/admin/pedidos/CP-1'));
    expect(auth.completeSignIn).toHaveBeenCalledExactlyOnceWith('abc');
  });

  it('opens the account when the requested page is not allowed', async () => {
    const { router } = await visit('/ingresar/google?code=abc&volver=%2F%2Fevil.example');

    await vi.waitFor(() => expect(router.url).toBe('/mi-cuenta'));
  });

  it('removes the code before a failed exchange and lets the person retry', async () => {
    const { auth, element, router } = await visit(
      '/ingresar/google?code=abc&volver=%2Fadmin#error=x&sb=',
      { error: new AppError('x', 'pkce_code_verifier_not_found') },
    );

    await vi.waitFor(() => expect(element.textContent).toContain('en otro navegador'));
    expect(router.url).toBe('/ingresar/google?volver=%2Fadmin');

    element.querySelector('button')?.click();
    expect(auth.signInWithGoogle).toHaveBeenCalledWith('/admin');
  });

  it('explains a cancelled sign-in without trying to exchange anything', async () => {
    const { auth, element, router } = await visit(
      '/ingresar/google?error=access_denied&error_description=user+denied#error=access_denied&sb=',
    );

    await vi.waitFor(() => expect(element.textContent).toContain('Cancelaste el ingreso'));
    expect(router.url).toBe('/ingresar/google?volver=%2Fmi-cuenta');
    expect(auth.completeSignIn).not.toHaveBeenCalled();
  });

  it('lets a person who is already signed in continue', async () => {
    const { element } = await visit('/ingresar/google?code=abc', {
      error: new AppError('x', 'pkce_code_verifier_not_found'),
      signedIn: true,
    });

    await vi.waitFor(() => expect(element.textContent).toContain('Ya ingresaste con Google.'));
    expect(element.textContent).toContain('ana@test.bo');
    expect(element.querySelector('cp-empty-state a')?.getAttribute('href')).toBe('/mi-cuenta');
  });
});
