import { FilterGroup, activeFilters, filtersFromParams } from './catalog-filters';

describe('filtersFromParams', () => {
  it('reads the Spanish query params', () => {
    expect(filtersFromParams({ mascota: 'gato', categoria: 'abrigos', talla: '00' })).toEqual({
      petType: 'gato',
      category: 'abrigos',
      size: '00',
    });
  });

  it('ignores empty and repeated values', () => {
    expect(filtersFromParams({ mascota: ' ', talla: ['1', '2'] })).toEqual({
      petType: null,
      category: null,
      size: null,
    });
  });
});

describe('activeFilters', () => {
  const groups: FilterGroup[] = [
    { key: 'petType', label: 'Mascota', options: [{ value: 'gato', label: 'Gato' }] },
    { key: 'size', label: 'Talla', options: [{ value: '00', label: '00' }] },
  ];

  it('labels each selected filter with its option name', () => {
    expect(activeFilters(groups, { petType: 'gato', category: null, size: '00' })).toEqual([
      { key: 'petType', label: 'Mascota: Gato' },
      { key: 'size', label: 'Talla: 00' },
    ]);
  });

  it('skips values that are not among the options', () => {
    expect(activeFilters(groups, { petType: 'loro', category: null, size: null })).toEqual([]);
  });
});
