import { Service, computed, inject, resource } from '@angular/core';

import { SettingsFormModel } from '../models/settings-form';
import { toSettingsForm, toSettingsUpdate } from '../models/settings';
import { AdminSettingsRepository } from './admin-settings.repository';

@Service()
export class AdminSettingsStore {
  private readonly repository = inject(AdminSettingsRepository);
  private readonly settings = resource({ loader: () => this.repository.getSettings() });

  readonly form = computed(() => {
    const settings = this.settings.value();
    return settings ? toSettingsForm(settings) : null;
  });
  readonly isLoading = this.settings.isLoading;
  readonly hasError = computed(() => this.settings.error() !== undefined);

  reload(): void {
    this.settings.reload();
  }

  /**
   * @param newQrImage A QR picked in this session, uploaded before saving the row
   */
  async save(model: SettingsFormModel, newQrImage: File | null): Promise<void> {
    const previousQrPath = this.settings.value()?.qr_image_path ?? null;
    const qrImagePath = newQrImage
      ? await this.repository.uploadQrImage(newQrImage)
      : model.qrImage || null;

    await this.repository.updateSettings(toSettingsUpdate(model, qrImagePath));
    this.settings.reload();

    if (previousQrPath && previousQrPath !== qrImagePath) {
      await this.deleteReplacedQr(previousQrPath);
    }
  }

  /**
   * @description The settings are already saved at this point, so a failed delete only leaves an unused file behind
   */
  private async deleteReplacedQr(path: string): Promise<void> {
    try {
      await this.repository.deleteImage(path);
    } catch {
      return;
    }
  }

  /**
   * @description A saved storage path becomes its public URL. A local preview URL is used as it is
   */
  imageSrc(qrImage: string): string {
    return qrImage.startsWith('blob:') ? qrImage : this.repository.imageUrl(qrImage);
  }
}
