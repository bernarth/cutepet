import { AppError } from '@shared/data-access/supabase-result';
import { PHOTO_UNREADABLE } from '@shared/images/photo-compression';
import { PROOF_MAX_BYTES, planProofUpload, proofErrorMessage, proofPath } from './payment-proof';

const file = (type: string, size: number) => ({ type, size });

describe('planProofUpload', () => {
  it('uploads screenshots and PDFs up to 5 MB as they are', () => {
    expect(planProofUpload(file('image/png', PROOF_MAX_BYTES)).kind).toBe('upload');
    expect(planProofUpload(file('application/pdf', 200_000)).kind).toBe('upload');
  });

  it('compresses a photo over 5 MB', () => {
    expect(planProofUpload(file('image/jpeg', PROOF_MAX_BYTES + 1)).kind).toBe('compress');
  });

  it('rejects a PDF over 5 MB with a reason', () => {
    expect(planProofUpload(file('application/pdf', PROOF_MAX_BYTES + 1))).toEqual({
      kind: 'reject',
      message: 'Este PDF pesa más de 5 MB. Sube una captura del comprobante en JPG o PNG.',
    });
  });

  it('rejects files the bucket does not accept, such as HEIC', () => {
    expect(planProofUpload(file('image/heic', 100))).toEqual({
      kind: 'reject',
      message: 'Sube una captura (JPG o PNG) o un PDF de hasta 5 MB.',
    });
    expect(planProofUpload(file('constructor', 100)).kind).toBe('reject');
  });
});

describe('proofPath', () => {
  it('puts the file in the order folder with its extension', () => {
    expect(proofPath('order-1', 'image/jpeg', 'abc')).toBe('order-1/abc.jpg');
    expect(proofPath('order-1', 'application/pdf', 'abc')).toBe('order-1/abc.pdf');
  });
});

describe('proofErrorMessage', () => {
  it('explains known database and photo errors', () => {
    expect(proofErrorMessage(new AppError('INVALID_STATUS', 'P0001'))).toBe(
      'Tu pedido cambió mientras tanto. Recarga la página.',
    );
    expect(proofErrorMessage(new AppError(PHOTO_UNREADABLE))).toBe(
      'No pudimos leer esta imagen. Sube una captura en JPG o PNG.',
    );
  });

  it('falls back to a connection message', () => {
    expect(proofErrorMessage(new Error('Failed to fetch'))).toBe(
      'No pudimos subir tu comprobante. Revisa tu conexión e inténtalo de nuevo.',
    );
  });
});
