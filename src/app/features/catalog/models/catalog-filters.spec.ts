import { filterParamValues, filtersFromParams } from './catalog-filters';

describe('filtersFromParams', () => {
  it('reads the Spanish query params', () => {
    expect(
      filtersFromParams({
        mascota: 'gato',
        categoria: 'abrigos',
        talla: '00',
        disponibilidad: 'a-pedido',
      }),
    ).toEqual({ petType: 'gato', category: 'abrigos', size: '00', availability: 'made_to_order' });
  });

  it('ignores empty values and unknown availability', () => {
    expect(filtersFromParams({ mascota: ' ', disponibilidad: 'xyz' })).toEqual({
      petType: null,
      category: null,
      size: null,
      availability: null,
    });
  });

  it('ignores repeated params', () => {
    expect(filtersFromParams({ talla: ['1', '2'] }).size).toBeNull();
  });
});

describe('filterParamValues', () => {
  it('turns the filters back into URL values', () => {
    expect(
      filterParamValues({ petType: 'perro', category: null, size: '1', availability: 'in_stock' }),
    ).toEqual({ petType: 'perro', category: null, size: '1', availability: 'en-stock' });
  });
});
