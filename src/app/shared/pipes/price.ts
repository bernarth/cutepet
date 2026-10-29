import { Pipe, PipeTransform } from '@angular/core';

const wholeAmount = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 });
const centsAmount = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * @description Formats the price with whole amount and 2 decimals of precision.
 * @param amount The number to be formated
 * @returns string formatted price
 */
export function formatPrice(amount: number): string {
  const format = Number.isInteger(amount) ? wholeAmount : centsAmount;
  return `Bs ${format.format(amount)}`;
}

@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(amount: number): string {
    return formatPrice(amount);
  }
}
