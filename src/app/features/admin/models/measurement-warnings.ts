import { MEASUREMENTS, MEASUREMENT_LABELS, Measurements, Size } from '@core/catalog/size';
import { formatCm, formatCmRange } from '@shared/pipes/centimeters';

/**
 * @description Exact measurements outside the size range [min, max]. The admin is warned, never blocked
 * @example ["El pecho (52 cm) está fuera del rango de la talla 2 (45 a 49 cm)."]
 */
export function measurementWarnings(measurements: Measurements, size: Size): string[] {
  return MEASUREMENTS.flatMap((measurement) => {
    const value = measurements[measurement];
    const { min, max } = size[measurement];

    if (value === undefined || (value >= min && value <= max)) {
      return [];
    }

    const label = MEASUREMENT_LABELS[measurement];
    return [
      `El ${label} (${formatCm(value)}) está fuera del rango de la talla ${size.label} (${formatCmRange(min, max)}).`,
    ];
  });
}
