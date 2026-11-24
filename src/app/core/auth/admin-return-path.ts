export const ADMIN_HOME_PATH = '/admin';
export const ADMIN_SIGN_IN_PATH = '/admin/ingresar';
export const RETURN_PATH_PARAM = 'volver';

const PLACEHOLDER_ORIGIN = 'https://cutepet.invalid';

/**
 * @description Page of the panel to open after sign-in. The value comes from the address bar, so anything
 * outside the panel becomes the panel home. The query and the fragment are dropped because they can carry sign-in tokens
 */
export function adminReturnPath(requested: string | null | undefined): string {
  if (!requested?.startsWith('/') || !URL.canParse(requested, PLACEHOLDER_ORIGIN)) {
    return ADMIN_HOME_PATH;
  }

  const { origin, pathname } = new URL(requested, PLACEHOLDER_ORIGIN);
  const isPanelPage =
    origin === PLACEHOLDER_ORIGIN && `${pathname}/`.startsWith(`${ADMIN_HOME_PATH}/`);
  const isSignInPage = `${pathname}/`.startsWith(`${ADMIN_SIGN_IN_PATH}/`);

  return isPanelPage && !isSignInPage ? pathname : ADMIN_HOME_PATH;
}
