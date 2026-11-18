import { Component, computed, inject, signal } from '@angular/core';
import { FormField, apply, disabled, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { MEASUREMENTS, MEASUREMENT_LABELS } from '@core/catalog/size';
import { formatCmRange } from '@shared/pipes/centimeters';
import { AdminSize } from '../data-access/admin-product.repository';
import { AdminVariant } from '../models/admin-product';
import { measurementWarnings } from '../models/measurement-warnings';
import {
  VariantFormModel,
  newVariantFormSchema,
  variantFormFrom,
  variantFormSchema,
  variantMeasurements,
} from '../models/variant-form';

export interface VariantDialogData {
  readonly variant: AdminVariant | null;
  readonly sizes: readonly AdminSize[];
  readonly usedSizeIds: readonly number[];
  readonly save: (model: VariantFormModel) => Promise<void>;
}

import { SaveState } from './save-state';

@Component({
  selector: 'cp-variant-dialog',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './variant-dialog.html',
  styleUrl: './dialog-form.scss',
})
export class VariantDialog {
  protected readonly data = inject<VariantDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<VariantDialog, boolean>>(MatDialogRef);

  protected readonly isNew = this.data.variant === null;
  protected readonly saving = new SaveState();

  private readonly model = signal(variantFormFrom(this.data.variant));
  protected readonly form = form(this.model, (path) => {
    apply(path, this.isNew ? newVariantFormSchema : variantFormSchema);
    disabled(path.sizeId, { when: () => this.data.variant?.hasOrders ?? false });
  });

  protected readonly sizeOptions = this.data.sizes.filter(
    (size) =>
      size.id === this.data.variant?.sizeId ||
      (size.active && !this.data.usedSizeIds.includes(size.id)),
  );

  private readonly selectedSize = computed(
    () => this.data.sizes.find((size) => size.id === this.model().sizeId) ?? null,
  );

  protected readonly sizeHint = computed(() => {
    const size = this.selectedSize();

    if (this.data.variant?.hasOrders) {
      return 'Ya tiene pedidos, así que la talla no se puede cambiar.';
    }
    if (!size) {
      return '';
    }

    const ranges = MEASUREMENTS.map(
      (measurement) =>
        `${MEASUREMENT_LABELS[measurement]} ${formatCmRange(size[measurement].min, size[measurement].max)}`,
    );
    return `Rango de la tabla: ${ranges.join(', ')}`;
  });

  protected readonly warnings = computed(() => {
    const size = this.selectedSize();
    return size ? measurementWarnings(variantMeasurements(this.model()), size) : [];
  });

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      const saved = await this.saving.run(
        () => this.data.save(this.model()),
        'Esta prenda ya tiene esa talla.',
      );
      if (saved) {
        this.dialogRef.close(true);
      }
    });
  }
}
