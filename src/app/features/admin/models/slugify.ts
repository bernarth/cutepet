import { normalizeText } from './admin-product.mapper';

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * @example slugify('Abrigo Ñandú Rosa') returns "abrigo-nandu-rosa"
 */
export function slugify(text: string): string {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
