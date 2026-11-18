import { Component, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { SizeFormModel, sizeFormSchema } from '../models/catalog-lists';
import { SaveState } from './save-state';

export interface SizeDialogData {
  readonly title: string;
  readonly model: SizeFormModel;
  readonly save: (model: SizeFormModel) => Promise<void>;
}

@Component({
  selector: 'cp-size-dialog',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './size-dialog.html',
  styleUrl: './dialog-form.scss',
})
export class SizeDialog {
  protected readonly data = inject<SizeDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<SizeDialog, boolean>>(MatDialogRef);

  protected readonly saving = new SaveState();
  private readonly model = signal<SizeFormModel>({ ...this.data.model });
  protected readonly form = form(this.model, sizeFormSchema);

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      const saved = await this.saving.run(
        () => this.data.save(this.model()),
        'Ya existe una talla con ese nombre o esa posición.',
      );
      if (saved) {
        this.dialogRef.close(true);
      }
    });
  }
}
