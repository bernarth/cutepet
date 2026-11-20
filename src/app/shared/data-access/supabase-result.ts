/**
 * @description The ONLY place that interprets Supabase `{ data, error }` responses.
 * Every repository uses `unwrap` instead of repeating `if (error) ...` checks
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    /** Extra data of a database error, for example the items of ITEMS_UNAVAILABLE as JSON text */
    readonly detail?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

interface SupabaseResponse<T> {
  data: T | null;
  error: { message: string; code?: string; details?: string | null } | null;
}

export function unwrap<T>({ data, error }: SupabaseResponse<T>): T {
  if (error) {
    throw toAppError(error);
  }
  if (data === null) {
    throw new AppError('No se encontraron datos', 'NOT_FOUND');
  }
  return data;
}

/**
 * @description Unwraps as `unwrap`, but `null` is a valid result (for example `.maybeSingle()`).
 * @param param0
 * @returns The generic T
 */
export function unwrapNullable<T>({ data, error }: SupabaseResponse<T>): T | null {
  if (error) {
    throw toAppError(error);
  }
  return data;
}

function toAppError(error: NonNullable<SupabaseResponse<unknown>['error']>): AppError {
  return new AppError(error.message, error.code, error.details || undefined);
}
