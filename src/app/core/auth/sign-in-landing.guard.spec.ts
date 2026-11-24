import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { signInLandingGuard } from './sign-in-landing.guard';

@Component({ template: '' })
class BlankPage {}

async function visit(url: string): Promise<string> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: '', pathMatch: 'full', canActivate: [signInLandingGuard], component: BlankPage },
        { path: 'ingresar/google', component: BlankPage },
      ]),
    ],
  });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);

  return router.url;
}

describe('signInLandingGuard', () => {
  it('leaves the home page alone', async () => {
    expect(await visit('/?utm_source=whatsapp')).toBe('/?utm_source=whatsapp');
  });

  it('moves a lost code to the callback page', async () => {
    expect(await visit('/?code=abc&utm_source=x')).toBe('/ingresar/google?code=abc');
  });

  it('moves a lost error without its description or fragment', async () => {
    expect(
      await visit(
        '/?error=invalid_request&error_code=bad_oauth_state&error_description=x#error=x&sb=',
      ),
    ).toBe('/ingresar/google?error=invalid_request&error_code=bad_oauth_state');
  });
});
