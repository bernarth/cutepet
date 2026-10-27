import { fitIssuesText, measurementsText, referenceMeasurementsText } from './measurements-text';
import { Variant } from './product';

function variant(exactMeasurements: Variant['exactMeasurements']): Variant {
  return {
    id: 1,
    sizeId: 1,
    sizeLabel: '2',
    isReserved: false,
    exactMeasurements,
    toleranceCm: null,
  };
}

describe('measurementsText', () => {
  it('lists only the measurements that exist, with a decimal comma', () => {
    expect(measurementsText(variant({ neck: 25, chest: 38.5 }))).toBe(
      'Talla 2 · Medidas de esta prenda: cuello 25 cm, pecho 38,5 cm',
    );
  });

  it('returns null without exact measurements', () => {
    expect(measurementsText(variant(null))).toBeNull();
  });
});

describe('fitIssuesText', () => {
  it('speaks from the garment point of view', () => {
    expect(fitIssuesText([{ measurement: 'backLength', differenceCm: -3 }])).toBe(
      'La prenda es 3 cm más corta de largo',
    );
  });

  it('joins several differences', () => {
    expect(
      fitIssuesText([
        { measurement: 'chest', differenceCm: 2.5 },
        { measurement: 'neck', differenceCm: -1 },
      ]),
    ).toBe('La prenda es 2,5 cm más ancha de pecho y 1 cm más angosta de cuello');
  });
});

describe('referenceMeasurementsText', () => {
  it('lists the size ranges when the item has no exact measurements', () => {
    expect(
      referenceMeasurementsText({
        id: 8,
        label: '4',
        sortOrder: 7,
        neck: { min: 36, max: 38 },
        chest: { min: 55, max: 59 },
        backLength: { min: 45, max: 49.5 },
      }),
    ).toBe(
      'Talla 4 · Medidas de referencia: cuello 36 a 38 cm, pecho 55 a 59 cm, largo 45 a 49,5 cm',
    );
  });
});
