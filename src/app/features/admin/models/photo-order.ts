export interface PhotoPosition {
  readonly id: number;
  readonly sortOrder: number;
}

/**
 * @description Moves a photo to `targetIndex` and numbers every photo again from 1.
 * Index 0 is the cover, which the store also uses for link previews
 * @returns Only the photos whose position changed
 */
export function movePhoto(
  photos: readonly PhotoPosition[],
  photoId: number,
  targetIndex: number,
): PhotoPosition[] {
  const ordered = [...photos].sort((a, b) => a.sortOrder - b.sortOrder);
  const from = ordered.findIndex((photo) => photo.id === photoId);

  if (from === -1) {
    return [];
  }

  const to = Math.min(Math.max(targetIndex, 0), ordered.length - 1);
  const [moved] = ordered.splice(from, 1);
  ordered.splice(to, 0, moved);

  return ordered
    .map((photo, index) => ({ id: photo.id, sortOrder: index + 1, previous: photo.sortOrder }))
    .filter((photo) => photo.sortOrder !== photo.previous)
    .map(({ id, sortOrder }) => ({ id, sortOrder }));
}
