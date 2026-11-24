import { AppError } from '@shared/data-access/supabase-result';
import { transferFailure, transferNotice } from './transfer-notice';

describe('transferNotice', () => {
  it('counts the moved orders', () => {
    expect(transferNotice({ outcome: 'moved', movedCount: 1 })?.message).toBe(
      'Listo, tu pedido ya está en tu cuenta.',
    );
    expect(transferNotice({ outcome: 'moved', movedCount: 2 })?.message).toBe(
      'Listo, tus 2 pedidos ya están en tu cuenta.',
    );
  });

  it('says nothing when there was nothing to move', () => {
    expect(transferNotice({ outcome: 'nothing', movedCount: 0 })).toBeNull();
    expect(transferNotice({ outcome: 'moved', movedCount: 0 })).toBeNull();
  });

  it('explains two pending payments', () => {
    expect(transferNotice({ outcome: 'pending_conflict', movedCount: 0 })?.kind).toBe(
      'pending_conflict',
    );
  });
});

describe('transferFailure', () => {
  it('tells an expired or used token apart from a failed call', () => {
    expect(transferFailure(new AppError('TRANSFER_INVALID', 'P0001')).kind).toBe('invalid');
    expect(transferFailure(new TypeError('Failed to fetch')).kind).toBe('failed');
  });
});
