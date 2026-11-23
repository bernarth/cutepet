import { Component, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import {
  NOTIFICATION_EVENT_LABELS,
  NotificationChannelFormModel,
  notificationChannelSchema,
} from '../models/notification-channel';
import { SaveState } from './save-state';

export interface NotificationChannelDialogData {
  readonly title: string;
  readonly model: NotificationChannelFormModel;
  readonly save: (model: NotificationChannelFormModel) => Promise<void>;
}

@Component({
  selector: 'cp-notification-channel-dialog',
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <form novalidate (submit)="save($event)">
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput autocomplete="off" [formField]="form.name" />
          <mat-hint>Para reconocerlo, por ejemplo "Celular de la dueña".</mat-hint>
          <mat-error>{{ form.name().errors()[0]?.message }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Chat ID de Telegram</mat-label>
          <input matInput autocomplete="off" [formField]="form.chatId" />
          <mat-hint>
            La persona debe abrir el bot en Telegram y enviar /start antes de que su chat ID
            funcione. Puede ver su chat ID escribiendo a &#64;userinfobot.
          </mat-hint>
          <mat-error>{{ form.chatId().errors()[0]?.message }}</mat-error>
        </mat-form-field>
        <fieldset>
          <legend>Avisos que recibe</legend>
          <mat-checkbox [formField]="form.proofUploaded">{{ labels.proof_uploaded }}</mat-checkbox>
          <mat-checkbox [formField]="form.qrExpiry">{{ labels.qr_expiry }}</mat-checkbox>
          @if (form.qrExpiry().touched() && form.qrExpiry().errors()[0]; as error) {
            <p class="error" role="alert">{{ error.message }}</p>
          }
        </fieldset>
        <mat-slide-toggle [formField]="form.isActive">Canal activo</mat-slide-toggle>
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
  styles: `
    fieldset {
      display: flex;
      flex-direction: column;
      margin-block: var(--cp-space-sm);
    }
    legend {
      margin-bottom: 0;
    }
  `,
})
export class NotificationChannelDialog {
  protected readonly data = inject<NotificationChannelDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<NotificationChannelDialog, boolean>>(MatDialogRef);

  protected readonly labels = NOTIFICATION_EVENT_LABELS;
  protected readonly saving = new SaveState();
  private readonly model = signal<NotificationChannelFormModel>({ ...this.data.model });
  protected readonly form = form(this.model, notificationChannelSchema);

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      if (
        await this.saving.run(
          () => this.data.save(this.model()),
          'Ya hay un canal con ese chat ID.',
        )
      ) {
        this.dialogRef.close(true);
      }
    });
  }
}
