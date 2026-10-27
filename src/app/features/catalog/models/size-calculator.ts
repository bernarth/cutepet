import { Variant } from './product';
import { MEASUREMENTS, Measurement, Measurements, Size } from './size';

export interface SizeRecommendation {
  /** null means the pet is outside every size and should ask for a custom request */
  readonly size: Size | null;
  readonly matchesDiffer: boolean;
  readonly approximate: boolean;
}

export interface FitIssue {
  readonly measurement: Measurement;
  /** Item minus pet, in cm. Positive means the item is bigger */
  readonly differenceCm: number;
}

export interface VariantFit {
  readonly variant: Variant;
  readonly fits: boolean;
  readonly issues: readonly FitIssue[];
}

export interface ProductFit {
  readonly variants: readonly VariantFit[];
  readonly approximate: boolean;
}

interface FitContext {
  readonly sorted: readonly Size[];
  readonly pet: Measurements;
  readonly defaultToleranceCm: number;
}

interface SizeBounds {
  readonly min: number;
  readonly max: number;
  readonly upperExclusive: number;
}

/** Accepts "38", "38.5" or "38,5". Anything else, zero or empty is undefined */
export function parseMeasurement(text: string): number | undefined {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function recommendSize(sizes: readonly Size[], pet: Measurements): SizeRecommendation {
  const sorted = sortSizes(sizes);
  const entered = enteredMeasurements(pet);
  const matches = entered.map((measurement) =>
    sorted.find((_, index) => isWithin(boundsOf(sorted, index, measurement), pet[measurement])),
  );
  const approximate = entered.length < MEASUREMENTS.length;

  if (matches.length === 0 || matches.some((size) => size === undefined)) {
    return { size: null, matchesDiffer: false, approximate };
  }

  const matched = matches.filter((size) => size !== undefined);
  const largest = matched.reduce((a, b) => (b.sortOrder > a.sortOrder ? b : a));
  const matchesDiffer = new Set(matched.map((size) => size.id)).size > 1;
  return { size: largest, matchesDiffer, approximate };
}

export function fitProduct(
  variants: readonly Variant[],
  sizes: readonly Size[],
  pet: Measurements,
  defaultToleranceCm: number,
): ProductFit {
  const context: FitContext = { sorted: sortSizes(sizes), pet, defaultToleranceCm };
  const entered = enteredMeasurements(pet);
  const fits = variants.map((variant) => {
    const issues = entered
      .map((measurement) => issueFor(variant, measurement, context))
      .filter((issue) => issue !== null);
    return { variant, fits: issues.length === 0, issues };
  });
  return { variants: fits, approximate: entered.length < MEASUREMENTS.length };
}

/** When no size fits, the one whose differences add up to the fewest cm. null when some size fits */
export function closestVariant(fit: ProductFit): VariantFit | null {
  if (fit.variants.length === 0 || fit.variants.some((variant) => variant.fits)) {
    return null;
  }
  return fit.variants.reduce((best, current) =>
    totalDifference(current) < totalDifference(best) ? current : best,
  );
}

function totalDifference(fit: VariantFit): number {
  return fit.issues.reduce((sum, issue) => sum + Math.abs(issue.differenceCm), 0);
}

function issueFor(
  variant: Variant,
  measurement: Measurement,
  { sorted, pet, defaultToleranceCm }: FitContext,
): FitIssue | null {
  const petValue = pet[measurement] ?? 0;
  const exact = variant.exactMeasurements?.[measurement];

  if (exact !== undefined) {
    const difference = roundCm(exact - petValue);
    const tolerance = variant.toleranceCm ?? defaultToleranceCm;
    return Math.abs(difference) <= tolerance ? null : { measurement, differenceCm: difference };
  }

  const index = sorted.findIndex((size) => size.id === variant.sizeId);
  if (index === -1) {
    return null;
  }
  const bounds = boundsOf(sorted, index, measurement);
  if (isWithin(bounds, petValue)) {
    return null;
  }
  const nearest = petValue < bounds.min ? bounds.min : bounds.max;
  return { measurement, differenceCm: roundCm(nearest - petValue) };
}

/** Ranges have 1 cm gaps, so each one runs until the next size starts. The last one ends at max + 1 */
function boundsOf(sorted: readonly Size[], index: number, measurement: Measurement): SizeBounds {
  const { min, max } = sorted[index][measurement];
  const next = sorted[index + 1];
  return { min, max, upperExclusive: next ? next[measurement].min : max + 1 };
}

function isWithin(bounds: SizeBounds, value: number | undefined): boolean {
  return value !== undefined && value >= bounds.min && value < bounds.upperExclusive;
}

function enteredMeasurements(pet: Measurements): Measurement[] {
  return MEASUREMENTS.filter((measurement) => (pet[measurement] ?? 0) > 0);
}

function sortSizes(sizes: readonly Size[]): Size[] {
  return [...sizes].sort((a, b) => a.sortOrder - b.sortOrder);
}

function roundCm(value: number): number {
  return Math.round(value * 10) / 10;
}
