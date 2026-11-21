import { AppError } from '@shared/data-access/supabase-result';
import { PHOTO_UNREADABLE } from '@shared/images/photo-compression';
import { adminErrorMessage } from './admin-errors';

describe('adminErrorMessage', () => {
  it('translates database rule codes', () => {
    expect(adminErrorMessage(new AppError('VARIANT_HAS_ORDERS', 'P0001'))).toBe(
      'Esta talla ya tiene pedidos, así que no se puede cambiar.',
    );
  });

  it('explains a photo the browser cannot read', () => {
    expect(adminErrorMessage(new AppError(PHOTO_UNREADABLE))).toBe(
      'No pudimos leer esta foto. Súbela en JPG o PNG, o desde la galería del celular.',
    );
  });

  it('explains a duplicate with the message of the form', () => {
    expect(
      adminErrorMessage(new AppError('duplicate key', '23505'), 'Otra prenda ya usa ese enlace.'),
    ).toBe('Otra prenda ya usa ese enlace.');
  });

  it('falls back to a connection message', () => {
    expect(adminErrorMessage(new Error('Failed to fetch'))).toBe(
      'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.',
    );
  });
});
