import { AppError } from '@shared/data-access/supabase-result';
import { PHOTO_UNREADABLE } from '@shared/images/photo-compression';

/** Same limit as the payment-proofs bucket */
export const PROOF_MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export const PROOF_ACCEPT = Object.keys(EXTENSIONS).join(',');

/**
 * - upload: the file goes as it is
 * - compress: a photo over 5 MB is made smaller in the browser first
 * - reject: the bucket would refuse it, so the customer gets the reason right away
 */
export type ProofPlan =
  | { readonly kind: 'upload' }
  | { readonly kind: 'compress' }
  | { readonly kind: 'reject'; readonly message: string };

export function planProofUpload(file: Pick<Blob, 'type' | 'size'>): ProofPlan {
  if (!Object.hasOwn(EXTENSIONS, file.type)) {
    return { kind: 'reject', message: 'Sube una captura (JPG o PNG) o un PDF de hasta 5 MB.' };
  }
  if (file.size <= PROOF_MAX_BYTES) {
    return { kind: 'upload' };
  }
  if (file.type === 'application/pdf') {
    return {
      kind: 'reject',
      message: 'Este PDF pesa más de 5 MB. Sube una captura del comprobante en JPG o PNG.',
    };
  }
  return { kind: 'compress' };
}

/**
 * @description The first folder must be the order id, the storage policy checks it.
 * A new name on every try, so a retry never collides with a file left by a failed try
 */
export function proofPath(orderId: string, contentType: string, fileId: string): string {
  return `${orderId}/${fileId}.${EXTENSIONS[contentType] ?? 'bin'}`;
}

const MESSAGES_BY_CODE: Readonly<Record<string, string>> = {
  [PHOTO_UNREADABLE]: 'No pudimos leer esta imagen. Sube una captura en JPG o PNG.',
  INVALID_STATUS: 'Tu pedido cambió mientras tanto. Recarga la página.',
  ORDER_NOT_FOUND: 'No encontramos tu pedido. Recarga la página.',
};

export function proofErrorMessage(error: unknown): string {
  const code = error instanceof AppError ? error.message : '';
  return Object.hasOwn(MESSAGES_BY_CODE, code)
    ? MESSAGES_BY_CODE[code]
    : 'No pudimos subir tu comprobante. Revisa tu conexión e inténtalo de nuevo.';
}
