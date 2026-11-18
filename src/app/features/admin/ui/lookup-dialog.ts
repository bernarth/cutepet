import { Component, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { LookupFormModel, lookupFormSchema } from '../models/catalog-lists';
import { SaveState } from './save-state';

export interface LookupDialogData {
  readonly title: string;
  readonly model: LookupFormModel;
  readonly uniqueMessage: string;
  readonly save: (model: LookupFormModel) => Promise<void>;
}

@Component({
  selector: 'cp-lookup-dialog',
  imports: [FormField, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <form novalidate (submit)="save($event)">
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput autocomplete="off" [formField]="form.name" />
          <mat-error>{{ form.name().errors()[0]?.message }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Posición</mat-label>
          <input matInput type="number" inputmode="numeric" [formField]="form.sortOrder" />
          <mat-hint>Orden en los filtros de la tienda. Menor va primero.</mat-hint>
          <mat-error>{{ form.sortOrder().errors()[0]?.message }}</mat-error>
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
export class LookupDialog {
  protected readonly data = inject<LookupDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<LookupDialog, boolean>>(MatDialogRef);

  protected readonly saving = new SaveState();
  private readonly model = signal<LookupFormModel>({ ...this.data.model });
  protected readonly form = form(this.model, lookupFormSchema);

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      if (await this.saving.run(() => this.data.save(this.model()), this.data.uniqueMessage)) {
        this.dialogRef.close(true);
      }
    });
  }
}
