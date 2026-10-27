import { Component, computed, input, signal } from '@angular/core';
import { FormField, form, pattern, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Variant } from '../models/product';
import { Measurements, Size } from '../models/size';
import { fitProduct, parseMeasurement, recommendSize } from '../models/size-calculator';
import { ProductFitList } from './product-fit-list';
import { SizeRecommendationView } from './size-recommendation-view';

const CENTIMETERS = /^\s*\d+([.,]\d+)?\s*$/;
const NUMBER_MESSAGE = 'Escribe solo números, por ejemplo 38 o 38,5';

/**
 * Without variants it recommends a size from the table (size guide).
 * With variants it compares the pet with each variant of one product (product page)
 */
@Component({
  selector: 'cp-size-calculator',
  imports: [FormField, MatFormFieldModule, MatInputModule, SizeRecommendationView, ProductFitList],
  templateUrl: './size-calculator.html',
  styles: `
    .fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--cp-space-sm);
    }
    .note {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class SizeCalculator {
  readonly sizes = input.required<readonly Size[]>();
  readonly variants = input<readonly Variant[] | null>(null);
  readonly toleranceCm = input<number | null>(null);

  private readonly model = signal({ chest: '', neck: '', backLength: '' });
  protected readonly measurementsForm = form(this.model, (path) => {
    required(path.chest, { message: 'El pecho es obligatorio' });
    pattern(path.chest, CENTIMETERS, { message: NUMBER_MESSAGE });
    pattern(path.neck, CENTIMETERS, { message: NUMBER_MESSAGE });
    pattern(path.backLength, CENTIMETERS, { message: NUMBER_MESSAGE });
  });

  private readonly pet = computed<Measurements | null>(() => {
    const { chest, neck, backLength } = this.model();
    const parsed = {
      chest: parseMeasurement(chest),
      neck: parseMeasurement(neck),
      backLength: parseMeasurement(backLength),
    };
    return this.measurementsForm().valid() && parsed.chest !== undefined ? parsed : null;
  });

  protected readonly tableResult = computed(() => {
    const pet = this.pet();
    return pet && !this.variants() ? recommendSize(this.sizes(), pet) : null;
  });

  protected readonly productResult = computed(() => {
    const pet = this.pet();
    const variants = this.variants();
    const tolerance = this.toleranceCm();
    return pet && variants && tolerance !== null
      ? fitProduct(variants, this.sizes(), pet, tolerance)
      : null;
  });

  protected readonly approximate = computed(
    () => this.tableResult()?.approximate ?? this.productResult()?.approximate ?? false,
  );
}
