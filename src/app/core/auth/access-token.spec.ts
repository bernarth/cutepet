import { accessTokenRole } from './access-token';

function tokenWith(claims: object): string {
  const json = new TextEncoder().encode(JSON.stringify(claims));
  const base64url = btoa(String.fromCharCode(...json))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `header.${base64url}.signature`;
}

describe('accessTokenRole', () => {
  it('reads the role added by the access token hook', () => {
    expect(accessTokenRole(tokenWith({ app_metadata: { role: 'admin' } }))).toBe('admin');
  });

  it('decodes payloads with accented names', () => {
    const token = tokenWith({
      user_metadata: { full_name: 'Begoña Pérez' },
      app_metadata: { role: 'admin' },
    });

    expect(accessTokenRole(token)).toBe('admin');
  });

  it('returns undefined when the token has no role', () => {
    expect(accessTokenRole(tokenWith({ app_metadata: { provider: 'google' } }))).toBeUndefined();
    expect(accessTokenRole(tokenWith({ app_metadata: { role: 1 } }))).toBeUndefined();
  });

  it('returns undefined for a missing or malformed token', () => {
    expect(accessTokenRole(undefined)).toBeUndefined();
    expect(accessTokenRole('not-a-token')).toBeUndefined();
    expect(accessTokenRole('header.%%%.signature')).toBeUndefined();
  });
});
