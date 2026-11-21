import { adminErrorMessage } from './admin-errors';
import { compressPhoto, encodeUnder, fitWithin } from './photo-compression';

const blobOf = (bytes: number) => new Blob([new Uint8Array(bytes)]);

describe('fitWithin', () => {
  it('scales the longest side down to the limit and keeps the proportion', () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin({ width: 3024, height: 4032 }, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('never scales a small photo up', () => {
    expect(fitWithin({ width: 800, height: 600 }, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe('encodeUnder', () => {
  it('stops at the first quality that fits the target', async () => {
    const sizes: Record<number, number> = { 0.9: 900, 0.7: 400, 0.5: 200 };
    const tried: number[] = [];

    const blob = await encodeUnder(
      async (quality) => {
        tried.push(quality);
        return blobOf(sizes[quality]);
      },
      500,
      [0.9, 0.7, 0.5],
    );

    expect(blob.size).toBe(400);
    expect(tried).toEqual([0.9, 0.7]);
  });

  it('returns the smallest attempt when nothing fits', async () => {
    const blob = await encodeUnder(async (quality) => blobOf(quality * 1000), 100, [0.9, 0.6]);

    expect(blob.size).toBe(600);
  });
});

describe('compressPhoto', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('explains a photo the browser cannot read, such as HEIC in Chrome', async () => {
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new DOMException('decode failed')));

    const error = await compressPhoto(new Blob(['heic'], { type: 'image/heic' })).catch(
      (failure: unknown) => failure,
    );

    expect(adminErrorMessage(error)).toBe(
      'No pudimos leer esta foto. Súbela en JPG o PNG, o desde la galería del celular.',
    );
  });
});
