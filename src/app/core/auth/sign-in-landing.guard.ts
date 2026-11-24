import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SIGN_IN_CALLBACK_PATH } from './return-path';

const SIGN_IN_PARAMS = ['code', 'error', 'error_code'] as const;

/**
 * @description Supabase sends a sign-in it cannot match to the home page. The callback page finishes or explains it
 * and cleans the address
 */
export const signInLandingGuard: CanActivateFn = ({ queryParamMap }) => {
  const found = SIGN_IN_PARAMS.filter((param) => queryParamMap.has(param));

  return found.length === 0
    ? true
    : inject(Router).createUrlTree([SIGN_IN_CALLBACK_PATH], {
        queryParams: Object.fromEntries(found.map((param) => [param, queryParamMap.get(param)])),
      });
};
