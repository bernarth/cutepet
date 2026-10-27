import { Component, input } from '@angular/core';

import { measurementsText } from '../models/measurements-text';
import { VARIANT_AVAILABILITY_SUFFIX, Variant } from '../models/product';

@Component({
  selector: 'cp-variant-list',
  template: `
    <h2>Tallas</h2>
    <ul>
      @for (variant of variants(); track variant.id) {
        <li [class.unavailable]="variant.availability !== 'available'">
          {{ describe(variant) }}{{ availabilitySuffix[variant.availability] }}
        </li>
      }
    </ul>
  `,
  styles: `
    h2 {
      margin: 0 0 var(--cp-space-xs);
      font: var(--mat-sys-title-medium);
      font-family: var(--cp-font-display);
    }
    ul {
      margin: 0;
      padding-inline-start: var(--cp-space-lg);
    }
    .unavailable {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class VariantList {
  readonly variants = input.required<readonly Variant[]>();

  protected readonly availabilitySuffix = VARIANT_AVAILABILITY_SUFFIX;

  protected describe(variant: Variant): string {
    return measurementsText(variant) ?? `Talla ${variant.sizeLabel}`;
  }
}
