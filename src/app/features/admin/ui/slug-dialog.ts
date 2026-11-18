import { Component, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { slugFormSchema } from '../models/product-form';

export interface SlugDialogData {
  readonly slug: string;
  readonly save: (slug: string) => Promise<void>;
}

import { SaveState } from './save-state';

@Component({
  selector: 'cp-slug-dialog',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Cambiar enlace</h2>
    <form novalidate (submit)="save($event)">
      <mat-dialog-content>
        <div class="warning" role="note">
          <mat-icon aria-hidden="true">warning</mat-icon>
          <p>
            Los enlaces que ya compartiste por WhatsApp o redes dejarán de funcionar. Cámbialo solo
            si es necesario.
          </p>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Enlace</mat-label>
          <span matTextPrefix>/catalogo/</span>
          <input matInput autocomplete="off" [formField]="form.slug" />
          <mat-error>{{ form.slug().errors()[0]?.message }}</mat-error>
        </mat-form-field>
        @if (saving.errorMessage(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="saving.isSaving()">Cambiar enlace</button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrl: './dialog-form.scss',
})
export class SlugDialog {
  protected readonly data = inject<SlugDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<SlugDialog, boolean>>(MatDialogRef);

  protected readonly saving = new SaveState();

  private readonly model = signal({ slug: this.data.slug });
  protected readonly form = form(this.model, slugFormSchema);

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      const saved = await this.saving.run(
        () => this.data.save(this.model().slug),
        'Otra prenda ya usa ese enlace.',
      );
      if (saved) {
        this.dialogRef.close(true);
      }
    });
  }
}
