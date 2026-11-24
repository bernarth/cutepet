import { adminReturnPath, signInReturnPath } from './return-path';

describe('adminReturnPath', () => {
  it.each(['/admin', '/admin/pedidos', '/admin/pedidos/CP-1234', '/admin/notificaciones'])(
    'keeps the panel page %s',
    (path) => {
      expect(adminReturnPath(path)).toBe(path);
    },
  );

  it.each([
    null,
    undefined,
    '',
    'admin/pedidos',
    '/',
    '/catalogo',
    '/administrar',
    'https://evil.example/admin',
    '//evil.example/admin',
    '/\\evil.example/admin',
    '\t//evil.example/admin',
    'javascript:alert(1)',
    'https://',
    '/admin/../catalogo',
    '/admin/%2e%2e/catalogo',
    '/admin/..//evil.example',
  ])('falls back to the panel home for %j', (path) => {
    expect(adminReturnPath(path)).toBe('/admin');
  });

  it('does not return to the sign-in page', () => {
    expect(adminReturnPath('/admin/ingresar')).toBe('/admin');
    expect(adminReturnPath('/admin/ingresar/')).toBe('/admin');
    expect(adminReturnPath('/admin/ingresar?volver=%2Fadmin%2Fpedidos')).toBe('/admin');
  });

  it('drops the query and the fragment, so sign-in tokens are never carried along', () => {
    expect(adminReturnPath('/admin/pedidos?code=abc#access_token=abc')).toBe('/admin/pedidos');
  });
});

describe('signInReturnPath', () => {
  it.each(['/mi-cuenta', '/mi-cuenta/pedido/abc', '/admin', '/admin/pedidos/CP-1234'])(
    'keeps %s',
    (path) => {
      expect(signInReturnPath(path)).toBe(path);
    },
  );

  it.each([
    null,
    '',
    '/',
    '/carrito',
    '/mi-cuentas',
    '/admin/ingresar',
    '//evil.example/mi-cuenta',
    '/mi-cuenta/../carrito',
  ])('falls back to the account for %j', (path) => {
    expect(signInReturnPath(path)).toBe('/mi-cuenta');
  });

  it('drops the query and the fragment', () => {
    expect(signInReturnPath('/mi-cuenta?code=abc#access_token=abc')).toBe('/mi-cuenta');
  });
});
