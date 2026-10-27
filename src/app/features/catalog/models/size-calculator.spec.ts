import { Variant } from './product';
import { Size } from './size';
import { fitProduct, parseMeasurement, recommendSize } from './size-calculator';

function size(id: number, label: string, [neck, chest, back]: number[][]): Size {
  return {
    id,
    label,
    sortOrder: id,
    neck: { min: neck[0], max: neck[1] },
    chest: { min: chest[0], max: chest[1] },
    backLength: { min: back[0], max: back[1] },
  };
}

const SIZES: Size[] = [
  size(3, '0', [
    [24, 26],
    [35, 39],
    [25, 29],
  ]),
  size(1, '000', [
    [17, 20],
    [25, 29],
    [15, 19],
  ]),
  size(2, '00', [
    [21, 23],
    [30, 34],
    [20, 24],
  ]),
];

function variant(overrides: Partial<Variant>): Variant {
  return {
    id: 1,
    sizeId: 2,
    sizeLabel: '00',
    availability: 'available',
    exactMeasurements: null,
    toleranceCm: null,
    ...overrides,
  };
}

describe('parseMeasurement', () => {
  it('accepts a dot or a comma as decimal separator', () => {
    expect(parseMeasurement('38')).toBe(38);
    expect(parseMeasurement(' 38,5 ')).toBe(38.5);
    expect(parseMeasurement('38.5')).toBe(38.5);
  });

  it('returns undefined for empty, zero or text', () => {
    expect(parseMeasurement('')).toBeUndefined();
    expect(parseMeasurement('0')).toBeUndefined();
    expect(parseMeasurement('abc')).toBeUndefined();
  });
});

describe('recommendSize', () => {
  it('treats each range as [min, next size min) to cover the 1 cm gaps', () => {
    expect(recommendSize(SIZES, { chest: 29.5 }).size?.label).toBe('000');
    expect(recommendSize(SIZES, { chest: 30 }).size?.label).toBe('00');
  });

  it('lets the last size reach max + 1', () => {
    expect(recommendSize(SIZES, { chest: 39.9 }).size?.label).toBe('0');
    expect(recommendSize(SIZES, { chest: 40 }).size).toBeNull();
  });

  it('recommends the largest match and flags that the matches differ', () => {
    const result = recommendSize(SIZES, { chest: 27, neck: 22, backLength: 26 });
    expect(result.size?.label).toBe('0');
    expect(result.matchesDiffer).toBe(true);
    expect(result.approximate).toBe(false);
  });

  it('does not flag a difference when every measurement matches the same size', () => {
    const result = recommendSize(SIZES, { chest: 31, neck: 22, backLength: 21 });
    expect(result.size?.label).toBe('00');
    expect(result.matchesDiffer).toBe(false);
  });

  it('suggests a custom request when any measurement is outside every size', () => {
    expect(recommendSize(SIZES, { chest: 31, neck: 10 }).size).toBeNull();
  });

  it('marks the result as approximate with fewer than three measurements', () => {
    expect(recommendSize(SIZES, { chest: 31 }).approximate).toBe(true);
  });
});

describe('fitProduct', () => {
  it('compares the pet with the exact measurements using the global tolerance', () => {
    const item = variant({ exactMeasurements: { chest: 40, backLength: 30 } });
    const [fit] = fitProduct([item], SIZES, { chest: 41.5, backLength: 33 }, 2).variants;
    expect(fit.fits).toBe(false);
    expect(fit.issues).toEqual([{ measurement: 'backLength', differenceCm: -3 }]);
  });

  it('uses the variant tolerance when it has one', () => {
    const item = variant({ exactMeasurements: { chest: 54 }, toleranceCm: 4 });
    expect(fitProduct([item], SIZES, { chest: 50 }, 2).variants[0].fits).toBe(true);
    expect(fitProduct([item], SIZES, { chest: 49 }, 2).variants[0].fits).toBe(false);
  });

  it('never uses the size table for a measurement the item has', () => {
    const broadChest = variant({ sizeId: 2, exactMeasurements: { chest: 45 } });
    expect(fitProduct([broadChest], SIZES, { chest: 45 }, 2).variants[0].fits).toBe(true);
  });

  it('falls back to the size range when the item has no exact measurement', () => {
    const item = variant({ sizeId: 2 });
    const [fit] = fitProduct([item], SIZES, { chest: 36, neck: 22 }, 2).variants;
    expect(fit.fits).toBe(false);
    expect(fit.issues).toEqual([{ measurement: 'chest', differenceCm: -2 }]);
  });

  it('reports a bigger item as a positive difference', () => {
    const item = variant({ exactMeasurements: { neck: 30 } });
    const [fit] = fitProduct([item], SIZES, { chest: 31, neck: 25 }, 2).variants;
    expect(fit.issues).toContainEqual({ measurement: 'neck', differenceCm: 5 });
  });

  it('evaluates every variant and marks the result as approximate', () => {
    const result = fitProduct(
      [variant({ id: 1, sizeId: 2 }), variant({ id: 2, sizeId: 3 })],
      SIZES,
      { chest: 31 },
      2,
    );
    expect(result.variants.map((fit) => fit.fits)).toEqual([true, false]);
    expect(result.approximate).toBe(true);
  });
});
