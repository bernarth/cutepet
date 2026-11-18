import { AppError } from '@shared/data-access/supabase-result';

const UNIQUE_VIOLATION = '23505';

const MESSAGES_BY_CODE: Readonly<Record<string, string>> = {
  VARIANT_HAS_ORDERS: 'Esta talla ya tiene pedidos, así que no se puede cambiar.',
  STOCK_BELOW_HELD:
    'Hay prendas reservadas en pedidos. El stock no puede quedar por debajo de ellas.',
  INVALID_STOCK: 'El stock debe ser un número entero de 0 o más.',
  REASON_REQUIRED: 'Escribe el motivo.',
  VARIANT_NOT_FOUND: 'No encontramos esa talla. Recarga la página.',
  FORBIDDEN: 'Tu cuenta no tiene permiso para hacer esto. Vuelve a ingresar.',
};

/**
 * @description Spanish message for an error from the database. `uniqueMessage` explains which value is repeated
 */
export function adminErrorMessage(error: unknown, uniqueMessage?: string): string {
  const code = error instanceof AppError ? error.code : undefined;
  const databaseCode = error instanceof AppError ? error.message : undefined;

  if (code === UNIQUE_VIOLATION && uniqueMessage) {
    return uniqueMessage;
  }

  return (
    MESSAGES_BY_CODE[databaseCode ?? ''] ??
    'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'
  );
}
