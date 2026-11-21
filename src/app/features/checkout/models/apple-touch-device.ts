/**
 * @description iPhone and iPad save a downloaded image to Files, where bank apps do not look, so
 * there the QR goes through the share sheet and its "Guardar imagen". iPadOS reports itself as a
 * Mac, so touch support tells them apart
 */
export function isAppleTouchDevice(
  device: Pick<Navigator, 'userAgent' | 'maxTouchPoints'>,
): boolean {
  return (
    /iPhone|iPad|iPod/.test(device.userAgent) ||
    (/Macintosh/.test(device.userAgent) && device.maxTouchPoints > 1)
  );
}
