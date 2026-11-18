import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { requiredText } from '../models/form-rules';
import { SaveState } from './save-state';

export interface PhotoAltDialogData {
  readonly alt: string;
  readonly save: (alt: string) => Promise<void>;
}

const ALT_MAX_LENGTH = 200;

@Component({
  selector: 'cp-photo-alt-dialog',
  imports: [FormField, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Descripción de la foto</h2>
    <form novalidate (submit)="save($event)">
      <mat-dialog-content>
        <p class="note">La leen quienes usan lector de pantalla y Google. Describe la prenda.</p>
        <mat-form-field appearance="outline">
          <mat-label>Descripción</mat-label>
          <input matInput autocomplete="off" [formField]="form.alt" />
          <mat-error>{{ form.alt().errors()[0]?.message }}</mat-error>
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
export class PhotoAltDialog {
  private readonly data = inject<PhotoAltDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<PhotoAltDialog, boolean>>(MatDialogRef);

  protected readonly saving = new SaveState();
  private readonly model = signal({ alt: this.data.alt });
  protected readonly form = form(this.model, (path) => {
    requiredText(path.alt, 'Escribe una descripción');
    maxLength(path.alt, ALT_MAX_LENGTH, { message: `Máximo ${ALT_MAX_LENGTH} caracteres` });
  });

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      if (await this.saving.run(() => this.data.save(this.model().alt))) {
        this.dialogRef.close(true);
      }
    });
  }
}
