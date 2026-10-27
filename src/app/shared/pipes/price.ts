import { Pipe, PipeTransform } from '@angular/core';

const wholeAmount = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 });
const centsAmount = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "Bs 120" for whole amounts, "Bs 120,50" otherwise. The only place that formats prices */
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
