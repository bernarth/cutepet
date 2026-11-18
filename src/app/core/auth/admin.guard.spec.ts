import { TestBed } from '@angular/core/testing';
import { PartialMatchRouteSnapshot, Route, Router, UrlTree, provideRouter } from '@angular/router';

import { adminGuard } from './admin.guard';
import { AuthStore } from './auth.store';

function runGuard(isAdmin: boolean): Promise<boolean | UrlTree> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: { ready: Promise.resolve(), isAdmin: () => isAdmin } },
    ],
  });

  return TestBed.runInInjectionContext(
    () =>
      adminGuard({} as Route, [], {} as PartialMatchRouteSnapshot) as Promise<boolean | UrlTree>,
  );
}

describe('adminGuard', () => {
  it('lets an admin in', async () => {
    expect(await runGuard(true)).toBe(true);
  });

  it('sends everyone else to the admin sign-in page', async () => {
    const result = await runGuard(false);
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree && router.serializeUrl(result)).toBe('/admin/ingresar');
  });
});
