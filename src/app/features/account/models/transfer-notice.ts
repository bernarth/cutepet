import { AppError } from '@shared/data-access/supabase-result';

export interface TransferResult {
  readonly outcome: string;
  readonly movedCount: number;
}

export interface TransferNotice {
  readonly kind: 'moved' | 'pending_conflict' | 'invalid' | 'failed';
  readonly message: string;
}

const PENDING_CONFLICT: TransferNotice = {
  kind: 'pending_conflict',
  message:
    'Tienes dos pagos pendientes, uno en tu cuenta y otro hecho como invitado. Termina o cancela el de tu cuenta, o espera a que venza uno de los dos, y vuelve a intentarlo. No movimos ningún pedido.',
};

const INVALID: TransferNotice = {
  kind: 'invalid',
  message:
    'No pudimos pasar tus pedidos porque el permiso venció o ya se usó. No se perdieron: escríbenos y los buscamos contigo.',
};

const FAILED: TransferNotice = {
  kind: 'failed',
  message: 'No pudimos pasar tus pedidos. Revisa tu conexión e inténtalo de nuevo.',
};

/**
 * @description Null when there was nothing to move
 */
export function transferNotice({ outcome, movedCount }: TransferResult): TransferNotice | null {
  if (outcome === 'pending_conflict') {
    return PENDING_CONFLICT;
  }
  if (outcome !== 'moved' || movedCount === 0) {
    return null;
  }
  return {
    kind: 'moved',
    message:
      movedCount === 1
        ? 'Listo, tu pedido ya está en tu cuenta.'
        : `Listo, tus ${movedCount} pedidos ya están en tu cuenta.`,
  };
}

export function transferFailure(error: unknown): TransferNotice {
  return error instanceof AppError && error.message === 'TRANSFER_INVALID' ? INVALID : FAILED;
}
