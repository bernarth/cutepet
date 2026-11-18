import { AppError } from '@shared/data-access/supabase-result';

export const PHOTO_UNREADABLE = 'PHOTO_UNREADABLE';
export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_TARGET_BYTES = 500 * 1024;
export const PHOTO_QUALITY_STEPS: readonly number[] = [0.85, 0.78, 0.7, 0.62, 0.55, 0.48];

export interface PhotoSize {
  readonly width: number;
  readonly height: number;
}

export type JpegEncoder = (quality: number) => Promise<Blob>;

/**
 * @description Scales down so the longest side is at most `maxSide`. Never scales up
 */
export function fitWithin(size: PhotoSize, maxSide: number): PhotoSize {
  const scale = Math.min(1, maxSide / Math.max(size.width, size.height));

  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/**
 * @description Lowers the JPEG quality step by step until the file fits. Returns the smallest attempt when none fits
 */
export async function encodeUnder(
  encode: JpegEncoder,
  targetBytes: number,
  qualitySteps: readonly number[] = PHOTO_QUALITY_STEPS,
): Promise<Blob> {
  let smallest: Blob | null = null;

  for (const quality of qualitySteps) {
    const blob = await encode(quality);
    if (blob.size <= targetBytes) {
      return blob;
    }
    smallest = smallest && smallest.size <= blob.size ? smallest : blob;
  }

  if (!smallest) {
    throw new Error('No hay calidades para comprimir la foto');
  }
  return smallest;
}

/**
 * @description Resizes and re-encodes a photo as JPEG in the browser. Re-encoding also drops EXIF data such as the phone location.
 * Only runs after the admin picks a file, so it is never called on the server
 */
export async function compressPhoto(file: Blob): Promise<Blob> {
  const bitmap = await decodePhoto(file);

  try {
    const { width, height } = fitWithin(bitmap, PHOTO_MAX_SIDE);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('El navegador no permite procesar fotos');
    }

    // JPEG has no transparency, so transparent PNG areas become white instead of black
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    return await encodeUnder(
      (quality) => canvas.convertToBlob({ type: 'image/jpeg', quality }),
      PHOTO_TARGET_BYTES,
    );
  } finally {
    bitmap.close();
  }
}

/**
 * @description Formats the browser cannot open (for example HEIC in Chrome) end here with a clear error
 */
async function decodePhoto(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new AppError(PHOTO_UNREADABLE);
  }
}
