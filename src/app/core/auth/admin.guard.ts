import { Injector, inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import {
  ADMIN_HOME_PATH,
  ADMIN_SIGN_IN_PATH,
  RETURN_PATH_PARAM,
  adminReturnPath,
} from './admin-return-path';

/**
 * @description UI convenience only. Real protection is RLS in the database.
 * AuthStore is imported lazily so the Supabase SDK stays out of the initial bundle.
 * @returns CanMatchFn
 */
export const adminGuard: CanMatchFn = async () => {
  const injector = inject(Injector);
  const router = inject(Router);
  const returnPath = adminReturnPath(router.currentNavigation()?.extractedUrl.toString());
  const { AuthStore } = await import('./auth.store');
  const auth = injector.get(AuthStore);
  await auth.ready;

  if (auth.isAdmin()) {
    return true;
  }

  return router.createUrlTree([ADMIN_SIGN_IN_PATH], {
    queryParams: returnPath === ADMIN_HOME_PATH ? {} : { [RETURN_PATH_PARAM]: returnPath },
  });
};
