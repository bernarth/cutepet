import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { requiredText } from '../models/form-rules';
import { REASON_MAX_LENGTH } from '../models/stock-adjustment-form';
import { SaveState } from './save-state';

export interface ReasonDialogData {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly suggestions: readonly string[];
  readonly save: (reason: string) => Promise<void>;
}

/**
 * @description Asks for confirmation and the required reason of a cancel, reject, revert or restore
 */
@Component({
  selector: 'cp-reason-dialog',
  imports: [FormField, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <form novalidate (submit)="save($event)">
      <mat-dialog-content>
        <p class="note">{{ data.message }}</p>
        @if (data.suggestions.length > 0) {
          <div class="reasons" role="group" aria-label="Motivos frecuentes">
            @for (suggestion of data.suggestions; track suggestion) {
              <button
                mat-stroked-button
                type="button"
                (click)="form.reason().value.set(suggestion)"
              >
                {{ suggestion }}
              </button>
            }
          </div>
        }
        <mat-form-field appearance="outline">
          <mat-label>Motivo</mat-label>
          <textarea matInput rows="2" [formField]="form.reason"></textarea>
          <mat-error>{{ form.reason().errors()[0]?.message }}</mat-error>
        </mat-form-field>
        @if (saving.errorMessage(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Volver</button>
        <button mat-flat-button type="submit" [disabled]="saving.isSaving()">
          {{ data.confirmLabel }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrl: './dialog-form.scss',
})
export class ReasonDialog {
  protected readonly data = inject<ReasonDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ReasonDialog, boolean>>(MatDialogRef);

  protected readonly saving = new SaveState();
  private readonly model = signal({ reason: '' });
  protected readonly form = form(this.model, (path) => {
    requiredText(path.reason, 'Escribe el motivo');
    maxLength(path.reason, REASON_MAX_LENGTH, {
      message: `Máximo ${REASON_MAX_LENGTH} caracteres`,
    });
  });

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      if (await this.saving.run(() => this.data.save(this.model().reason))) {
        this.dialogRef.close(true);
      }
    });
  }
}
