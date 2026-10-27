import { fitIssueText, measurementsText } from './measurements-text';
import { Variant } from './product';

function variant(exactMeasurements: Variant['exactMeasurements']): Variant {
  return {
    id: 1,
    sizeId: 1,
    sizeLabel: '2',
    availability: 'available',
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

describe('fitIssueText', () => {
  it('describes a shorter back length', () => {
    expect(fitIssueText({ measurement: 'backLength', differenceCm: -3 })).toBe(
      'el largo es 3 cm más corto',
    );
  });

  it('describes a bigger chest', () => {
    expect(fitIssueText({ measurement: 'chest', differenceCm: 2.5 })).toBe(
      'el pecho es 2,5 cm más grande',
    );
  });
});
