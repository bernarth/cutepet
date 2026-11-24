import { AppError } from '@shared/data-access/supabase-result';

export type SignInFailure =
  'cancelled' | 'other_browser' | 'expired' | 'nothing_in_progress' | 'account_exists' | 'failed';

export const SIGN_IN_FAILURE_MESSAGES: Readonly<Record<SignInFailure, string>> = {
  cancelled: 'Cancelaste el ingreso con Google. Puedes intentarlo de nuevo cuando quieras.',
  other_browser:
    'Este ingreso empezó en otra pestaña o en otro navegador. Vuelve a intentarlo aquí.',
  expired: 'El ingreso con Google venció o ya se usó. Vuelve a intentarlo.',
  nothing_in_progress: 'No hay un ingreso en curso.',
  account_exists:
    'Esa cuenta de Google ya existe en CutePet, pero no pudimos ingresar. Inténtalo de nuevo para guardar tus pedidos.',
  failed: 'No pudimos completar el ingreso con Google. Inténtalo de nuevo.',
};

const FAILURE_BY_CODE: Readonly<Record<string, SignInFailure>> = {
  pkce_code_verifier_not_found: 'other_browser',
  bad_code_verifier: 'other_browser',
  flow_state_not_found: 'expired',
  flow_state_expired: 'expired',
  bad_oauth_state: 'expired',
  bad_oauth_callback: 'expired',
  identity_already_exists: 'account_exists',
  email_exists: 'account_exists',
};

/**
 * @description What the address says when Google or Supabase did not give a code
 */
export function addressFailure(error: string | null, errorCode: string | null): SignInFailure {
  if (errorCode) {
    return FAILURE_BY_CODE[errorCode] ?? 'failed';
  }
  if (!error) {
    return 'nothing_in_progress';
  }
  return error === 'access_denied' ? 'cancelled' : 'failed';
}

export function exchangeFailure(error: unknown): SignInFailure {
  const code = error instanceof AppError ? error.code : undefined;
  return FAILURE_BY_CODE[code ?? ''] ?? 'failed';
}
