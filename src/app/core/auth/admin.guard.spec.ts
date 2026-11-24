import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { adminGuard } from './admin.guard';
import { AuthStore } from './auth.store';

@Component({ template: '' })
class BlankPage {}

async function visit(url: string, isAdmin: boolean): Promise<string> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/ingresar', component: BlankPage },
        {
          path: 'admin',
          canMatch: [adminGuard],
          children: [{ path: '**', component: BlankPage }],
        },
      ]),
      { provide: AuthStore, useValue: { ready: Promise.resolve(), isAdmin: () => isAdmin } },
    ],
  });
  const router = TestBed.inject(Router);

  await router.navigateByUrl(url);

  return router.url;
}

describe('adminGuard', () => {
  it('lets an admin in', async () => {
    expect(await visit('/admin/pedidos/CP-1', true)).toBe('/admin/pedidos/CP-1');
  });

  it('sends everyone else to the admin sign-in page', async () => {
    expect(await visit('/admin', false)).toBe('/admin/ingresar');
  });

  it('remembers the requested page', async () => {
    expect(await visit('/admin/pedidos/CP-1', false)).toBe(
      '/admin/ingresar?volver=%2Fadmin%2Fpedidos%2FCP-1',
    );
  });

  it('never copies tokens from the address into the sign-in page', async () => {
    expect(await visit('/admin/pedidos/CP-1?code=abc#access_token=abc', false)).toBe(
      '/admin/ingresar?volver=%2Fadmin%2Fpedidos%2FCP-1',
    );
  });
});
