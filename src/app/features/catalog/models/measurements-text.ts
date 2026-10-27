import { Variant } from './product';
import { MEASUREMENTS, MEASUREMENT_LABELS, Measurement } from './size';
import { FitIssue } from './size-calculator';

const centimeters = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 });

export function formatCm(value: number): string {
  return `${centimeters.format(value)} cm`;
}

/** "Talla 2 · Medidas de esta prenda: cuello 25 cm, pecho 38,5 cm" or null without exact measurements */
export function measurementsText(variant: Variant): string | null {
  const exact = variant.exactMeasurements;
  if (!exact) {
    return null;
  }
  const parts = MEASUREMENTS.filter((measurement) => exact[measurement] !== undefined).map(
    (measurement) => `${MEASUREMENT_LABELS[measurement]} ${formatCm(exact[measurement] ?? 0)}`,
  );
  return `Talla ${variant.sizeLabel} · Medidas de esta prenda: ${parts.join(', ')}`;
}

/** "el largo es 3 cm más corto" */
export function fitIssueText({ measurement, differenceCm }: FitIssue): string {
  const { smaller, bigger } = COMPARISONS[measurement];
  const comparison = differenceCm > 0 ? bigger : smaller;
  return `el ${MEASUREMENT_LABELS[measurement]} es ${formatCm(Math.abs(differenceCm))} ${comparison}`;
}

const COMPARISONS: Readonly<Record<Measurement, { smaller: string; bigger: string }>> = {
  neck: { smaller: 'más chico', bigger: 'más grande' },
  chest: { smaller: 'más chico', bigger: 'más grande' },
  backLength: { smaller: 'más corto', bigger: 'más largo' },
};
