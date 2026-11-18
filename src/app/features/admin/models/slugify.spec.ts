import { slugify } from './slugify';

describe('slugify', () => {
  it('turns a product name into a link without accents or spaces', () => {
    expect(slugify('Abrigo Ñandú Rosa')).toBe('abrigo-nandu-rosa');
  });

  it('collapses symbols and trims dashes at both ends', () => {
    expect(slugify('  ¡Vestido 2 x 1!  ')).toBe('vestido-2-x-1');
  });
});
