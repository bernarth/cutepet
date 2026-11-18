import { SchemaPath, required, validate } from '@angular/forms/signals';

/**
 * @description Required text that also rejects only spaces
 */
export function requiredText(path: SchemaPath<string>, message: string): void {
  required(path, { message });
  validate(path, ({ value }) =>
    value() !== '' && value().trim() === '' ? { kind: 'required', message } : undefined,
  );
}

export function maxDecimals(path: SchemaPath<number | null>, decimals: number): void {
  const message =
    decimals === 0
      ? 'Usa un número entero'
      : `Usa como máximo ${decimals} ${decimals === 1 ? 'decimal' : 'decimales'}`;

  validate(path, ({ value }) => {
    const amount = value();
    return amount !== null && !hasAtMostDecimals(amount, decimals)
      ? { kind: 'decimals', message }
      : undefined;
  });
}

export function hasAtMostDecimals(amount: number, decimals: number): boolean {
  const scaled = amount * 10 ** decimals;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}
