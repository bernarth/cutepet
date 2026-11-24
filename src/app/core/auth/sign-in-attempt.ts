import { Service } from '@angular/core';

const STORAGE_KEY = 'cutepet.sign-in.v1';

/**
 * - signing_in: plain Google sign-in
 * - linking: a guest agreed to keep their orders in a Google account
 * - transferring: that account already exists, so the orders move to it after sign-in
 */
export type SignInAttempt =
  | { readonly kind: 'signing_in' }
  | { readonly kind: 'linking' }
  | {
      readonly kind: 'transferring';
      readonly transferToken: string;
      readonly orderCodes: readonly string[];
    };

/**
 * @description The sign-in this tab started. It is also the proof that the guest agreed to keep their orders,
 * so it never leaves the tab and any new sign-in replaces it. Only called from the browser
 */
@Service()
export class SignInAttemptStorage {
  read(): SignInAttempt | null {
    try {
      return parseSignInAttempt(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  save(attempt: SignInAttempt): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
    } catch {
      console.warn('The sign-in attempt could not be stored');
    }
  }

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      console.warn('The sign-in attempt could not be removed');
    }
  }
}

export function parseSignInAttempt(stored: string | null): SignInAttempt | null {
  const value = parseRecord(stored);

  if (value['kind'] === 'signing_in' || value['kind'] === 'linking') {
    return { kind: value['kind'] };
  }

  const { transferToken, orderCodes } = value;
  return value['kind'] === 'transferring' &&
    typeof transferToken === 'string' &&
    isStringArray(orderCodes)
    ? { kind: 'transferring', transferToken, orderCodes }
    : null;
}

function parseRecord(stored: string | null): Readonly<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(stored ?? 'null');
    return typeof value === 'object' && value !== null ? { ...value } : {};
  } catch {
    return {};
  }
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
