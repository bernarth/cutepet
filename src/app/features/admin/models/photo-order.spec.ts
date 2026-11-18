import { movePhoto, nextSortOrder } from './photo-order';

const photos = [
  { id: 10, sortOrder: 1 },
  { id: 11, sortOrder: 2 },
  { id: 12, sortOrder: 3 },
];

describe('movePhoto', () => {
  it('makes a photo the cover and shifts the others', () => {
    expect(movePhoto(photos, 12, 0)).toEqual([
      { id: 12, sortOrder: 1 },
      { id: 10, sortOrder: 2 },
      { id: 11, sortOrder: 3 },
    ]);
  });

  it('swaps neighbours and returns only what changed', () => {
    expect(movePhoto(photos, 10, 1)).toEqual([
      { id: 11, sortOrder: 1 },
      { id: 10, sortOrder: 2 },
    ]);
  });

  it('renumbers gaps left by deleted photos', () => {
    expect(
      movePhoto(
        [
          { id: 1, sortOrder: 2 },
          { id: 2, sortOrder: 5 },
        ],
        2,
        5,
      ),
    ).toEqual([
      { id: 1, sortOrder: 1 },
      { id: 2, sortOrder: 2 },
    ]);
  });

  it('ignores an unknown photo', () => {
    expect(movePhoto(photos, 99, 0)).toEqual([]);
  });
});

describe('nextSortOrder', () => {
  it('places a new photo after the last one', () => {
    expect(nextSortOrder(photos)).toBe(4);
    expect(nextSortOrder([])).toBe(1);
  });
});
