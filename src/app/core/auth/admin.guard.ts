import { Injector, inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

/**
 * @description UI convenience only. Real protection is RLS in the database.
 * AuthStore is imported lazily so the Supabase SDK stays out of the initial bundle.
 * @returns CanMatchFn
 */
export const adminGuard: CanMatchFn = async () => {
  const injector = inject(Injector);
  const router = inject(Router);
  const { AuthStore } = await import('./auth.store');
  const auth = injector.get(AuthStore);
  await auth.ready;

  return auth.isAdmin() || router.createUrlTree(['/']);
};
