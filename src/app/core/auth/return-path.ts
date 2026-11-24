export const ADMIN_HOME_PATH = '/admin';
export const ADMIN_SIGN_IN_PATH = '/admin/ingresar';
export const ACCOUNT_PATH = '/mi-cuenta';
export const SIGN_IN_CALLBACK_PATH = '/ingresar/google';
export const RETURN_PATH_PARAM = 'volver';

const PLACEHOLDER_ORIGIN = 'https://cutepet.invalid';

/**
 * @description Page of the panel to open after sign-in. Anything outside the panel becomes the panel home
 */
export function adminReturnPath(requested: string | null | undefined): string {
  return pathUnder([ADMIN_HOME_PATH], requested) ?? ADMIN_HOME_PATH;
}

/**
 * @description Page to open after any sign-in: the panel or the account. Anything else becomes the account
 */
export function signInReturnPath(requested: string | null | undefined): string {
  return pathUnder([ADMIN_HOME_PATH, ACCOUNT_PATH], requested) ?? ACCOUNT_PATH;
}

/**
 * @description The value comes from the address bar, so only these sections are allowed. The query and the fragment
 * are dropped because they can carry sign-in codes
 */
function pathUnder(
  sections: readonly string[],
  requested: string | null | undefined,
): string | null {
  if (!requested?.startsWith('/') || !URL.canParse(requested, PLACEHOLDER_ORIGIN)) {
    return null;
  }

  const { origin, pathname } = new URL(requested, PLACEHOLDER_ORIGIN);
  const isAllowed =
    origin === PLACEHOLDER_ORIGIN && sections.some((section) => isUnder(section, pathname));

  return isAllowed && !isUnder(ADMIN_SIGN_IN_PATH, pathname) ? pathname : null;
}

function isUnder(section: string, pathname: string): boolean {
  return `${pathname}/`.startsWith(`${section}/`);
}
