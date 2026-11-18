import { Component, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AdminVariant, heldUnits } from '../models/admin-product';
import {
  REASON_MAX_LENGTH,
  STOCK_ADJUSTMENT_REASONS,
  StockAdjustmentModel,
  stockAdjustmentSchema,
} from '../models/stock-adjustment-form';

export interface StockAdjustmentDialogData {
  readonly variant: AdminVariant;
  readonly save: (newStock: number, reason: string) => Promise<void>;
}

import { SaveState } from './save-state';

@Component({
  selector: 'cp-stock-adjustment-dialog',
  imports: [FormField, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Ajustar stock · Talla {{ data.variant.sizeLabel }}</h2>
    <form novalidate (submit)="save($event)">
      <mat-dialog-content>
        <p class="note">
          Solo para correcciones. Las ventas se registran con una venta rápida. Stock actual:
          {{ data.variant.stock }}
          @if (held > 0) {
            · {{ held }} en pedidos
          }
        </p>
        <mat-form-field appearance="outline">
          <mat-label>Nuevo stock</mat-label>
          <input matInput type="number" inputmode="numeric" [formField]="form.newStock" />
          <mat-error>{{ form.newStock().errors()[0]?.message }}</mat-error>
        </mat-form-field>

        <div class="reasons" role="group" aria-label="Motivos frecuentes">
          @for (reason of reasons; track reason) {
            <button mat-stroked-button type="button" (click)="useReason(reason)">
              {{ reason }}
            </button>
          }
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Motivo</mat-label>
          <textarea matInput rows="2" [formField]="form.reason"></textarea>
          <mat-hint align="end"
            >{{ form.reason().value().length }} / {{ reasonMaxLength }}</mat-hint
          >
          <mat-error>{{ form.reason().errors()[0]?.message }}</mat-error>
        </mat-form-field>

        @if (saving.errorMessage(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="saving.isSaving()">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrl: './dialog-form.scss',
})
export class StockAdjustmentDialog {
  protected readonly data = inject<StockAdjustmentDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<StockAdjustmentDialog, boolean>>(MatDialogRef);

  protected readonly held = heldUnits(this.data.variant);
  protected readonly reasons = STOCK_ADJUSTMENT_REASONS;
  protected readonly reasonMaxLength = REASON_MAX_LENGTH;
  protected readonly saving = new SaveState();

  private readonly model = signal<StockAdjustmentModel>({ newStock: null, reason: '' });
  protected readonly form = form(this.model, stockAdjustmentSchema(this.data.variant));

  protected useReason(reason: string): void {
    this.form.reason().value.set(reason);
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      const { newStock, reason } = this.model();
      if (newStock === null) {
        return;
      }
      const saved = await this.saving.run(() => this.data.save(newStock, reason));
      if (saved) {
        this.dialogRef.close(true);
      }
    });
  }
}
