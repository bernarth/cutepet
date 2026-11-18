const centimeters = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 });

/**
 * @example formatCm(38.5) returns "38,5 cm"
 */
export function formatCm(value: number): string {
  return `${centimeters.format(value)} cm`;
}

/**
 * @example formatCmRange(45, 49) returns "45 a 49 cm"
 */
export function formatCmRange(min: number, max: number): string {
  return `${centimeters.format(min)} a ${formatCm(max)}`;
}
