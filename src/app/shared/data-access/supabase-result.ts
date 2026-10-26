/**
 * The ONLY place that interprets Supabase `{ data, error }` responses.
 * Every repository uses `unwrap` instead of repeating `if (error) ...` checks
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

interface SupabaseResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export function unwrap<T>({ data, error }: SupabaseResponse<T>): T {
  if (error) {
    throw new AppError(error.message, error.code);
  }
  if (data === null) {
    throw new AppError('No se encontraron datos', 'NOT_FOUND');
  }
  return data;
}

/** Same as `unwrap`, but `null` is a valid result (for example `.maybeSingle()`). */
export function unwrapNullable<T>({ data, error }: SupabaseResponse<T>): T | null {
  if (error) {
    throw new AppError(error.message, error.code);
  }
  return data;
}
