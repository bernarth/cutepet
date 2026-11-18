interface AccessTokenClaims {
  readonly app_metadata?: { readonly role?: unknown };
}

/**
 * @description Reads the role claim that the custom access token hook adds. The signature is not checked here:
 * this only drives the UI, and RLS checks the real token on every request
 * @param accessToken JWT from the Supabase session
 * @returns The role, or undefined when the token is missing, malformed or has no role
 */
export function accessTokenRole(accessToken: string | undefined): string | undefined {
  const payload = accessToken?.split('.')[1];

  if (!payload) {
    return undefined;
  }

  try {
    const role = decodePayload(payload).app_metadata?.role;
    return typeof role === 'string' ? role : undefined;
  } catch {
    return undefined;
  }
}

function decodePayload(payload: string): AccessTokenClaims {
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

  return JSON.parse(new TextDecoder().decode(bytes)) as AccessTokenClaims;
}
