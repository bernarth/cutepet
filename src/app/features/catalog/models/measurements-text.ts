import { Variant } from './product';
import { MEASUREMENTS, MEASUREMENT_LABELS, Measurement, Size } from './size';
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

/** For a size without exact measurements: "Talla 4 · Medidas de referencia: cuello 36 a 38 cm, ..." */
export function referenceMeasurementsText(size: Size): string {
  const parts = MEASUREMENTS.map((measurement) => {
    const { min, max } = size[measurement];
    return `${MEASUREMENT_LABELS[measurement]} ${centimeters.format(min)} a ${formatCm(max)}`;
  });
  return `Talla ${size.label} · Medidas de referencia: ${parts.join(', ')}`;
}

/** "La prenda es 3 cm más corta de largo y 2 cm más ancha de pecho" */
export function fitIssuesText(issues: readonly FitIssue[]): string {
  return `La prenda es ${issues.map(issueText).join(' y ')}`;
}

const GARMENT_COMPARISONS: Readonly<Record<Measurement, { smaller: string; bigger: string }>> = {
  neck: { smaller: 'más angosta de cuello', bigger: 'más ancha de cuello' },
  chest: { smaller: 'más angosta de pecho', bigger: 'más ancha de pecho' },
  backLength: { smaller: 'más corta de largo', bigger: 'más larga' },
};

function issueText({ measurement, differenceCm }: FitIssue): string {
  const { smaller, bigger } = GARMENT_COMPARISONS[measurement];
  return `${formatCm(Math.abs(differenceCm))} ${differenceCm > 0 ? bigger : smaller}`;
}
