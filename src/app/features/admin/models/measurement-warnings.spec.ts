import { Size } from '@core/catalog/size';
import { measurementWarnings } from './measurement-warnings';

const sizeTwo: Size = {
  id: 5,
  label: '2',
  sortOrder: 5,
  neck: { min: 30, max: 32 },
  chest: { min: 45, max: 49 },
  backLength: { min: 35, max: 39 },
};

describe('measurementWarnings', () => {
  it('warns about each measurement outside the table range', () => {
    expect(measurementWarnings({ chest: 52, backLength: 34.5 }, sizeTwo)).toEqual([
      'El pecho (52 cm) está fuera del rango de la talla 2 (45 a 49 cm).',
      'El largo (34,5 cm) está fuera del rango de la talla 2 (35 a 39 cm).',
    ]);
  });

  it('accepts both ends of the range and missing measurements', () => {
    expect(measurementWarnings({ neck: 30, chest: 49 }, sizeTwo)).toEqual([]);
  });
});
