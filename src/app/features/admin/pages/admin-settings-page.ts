import { Component, DestroyRef, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { AdminSettingsStore } from '../data-access/admin-settings.store';
import { isoDate } from '@core/dates/date-format';
import { qrExpiryNotice } from '../models/settings';
import {
  EMPTY_SETTINGS,
  QR_IMAGE_MAX_BYTES,
  QR_IMAGE_TYPES,
  SettingsFormModel,
  settingsSchema,
} from '../models/settings-form';
import { SaveState } from '../ui/save-state';

@Component({
  selector: 'cp-admin-settings-page',
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    EmptyState,
    LoadingBar,
  ],
  templateUrl: './admin-settings-page.html',
  styleUrl: './admin-settings-page.scss',
})
export class AdminSettingsPage {
  protected readonly store = inject(AdminSettingsStore);
  private readonly snackBar = inject(MatSnackBar);

  private readonly today = isoDate(new Date());
  protected readonly saving = new SaveState();
  protected readonly qrFileError = signal<string | null>(null);
  private readonly newQrImage = signal<File | null>(null);

  private readonly model = linkedSignal<SettingsFormModel>(
    () => this.store.form() ?? { ...EMPTY_SETTINGS },
  );
  protected readonly form = form(this.model, settingsSchema(this.today));

  protected readonly qrNotice = computed(() =>
    qrExpiryNotice(this.model().qrExpiresOn, this.today),
  );
  protected readonly hasChanges = computed(() => this.form().dirty() || this.newQrImage() !== null);

  constructor() {
    this.store.reload();
    inject(DestroyRef).onDestroy(() => this.releasePreview());
  }

  protected pickQr(picker: HTMLInputElement): void {
    const [file] = picker.files ?? [];
    picker.value = '';

    if (!file) {
      return;
    }
    if (!QR_IMAGE_TYPES.includes(file.type)) {
      this.qrFileError.set('Sube el QR en PNG o JPG, tal como lo descargaste del banco.');
      return;
    }
    if (file.size > QR_IMAGE_MAX_BYTES) {
      this.qrFileError.set('La imagen pesa más de 2 MB. Usa la que descargaste del banco.');
      return;
    }

    this.releasePreview();
    this.qrFileError.set(null);
    this.newQrImage.set(file);
    this.form.qrImage().value.set(URL.createObjectURL(file));
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      const saved = await this.saving.run(() => this.store.save(this.model(), this.newQrImage()));

      if (saved) {
        this.releasePreview();
        this.newQrImage.set(null);
        this.form().reset();
        this.snackBar.open('Configuración guardada', undefined, { duration: 3000 });
      }
    });
  }

  private releasePreview(): void {
    const image = this.model().qrImage;
    if (image.startsWith('blob:')) {
      URL.revokeObjectURL(image);
    }
  }
}
