import { Service, inject } from '@angular/core';

import { Tables, TablesUpdate } from '@core/supabase/database.types';
import { storeImageUrl } from '@core/supabase/store-image-url';
import { SUPABASE } from '@core/supabase/supabase.client';
import { AppError, unwrap, unwrapNullable } from '@shared/data-access/supabase-result';

@Service()
export class AdminSettingsRepository {
  private readonly supabase = inject(SUPABASE);

  async getSettings(): Promise<Tables<'settings'>> {
    const [settings] = unwrap(await this.supabase.from('settings').select('*').limit(1));

    if (!settings) {
      throw new AppError('Faltan los ajustes de la tienda', 'NOT_FOUND');
    }

    return settings;
  }

  async updateSettings(update: TablesUpdate<'settings'>): Promise<void> {
    unwrapNullable(await this.supabase.from('settings').update(update).eq('id', true));
  }

  /**
   * @description Stores the original file without re-encoding, so the bank app can still read the QR
   * @returns The storage path
   */
  async uploadQrImage(file: File): Promise<string> {
    const extension = file.type === 'image/png' ? 'png' : 'jpg';
    const path = `settings/qr-${crypto.randomUUID()}.${extension}`;

    unwrap(
      await this.supabase.storage
        .from('store-images')
        .upload(path, file, { contentType: file.type, cacheControl: '31536000' }),
    );

    return path;
  }

  async deleteImage(path: string): Promise<void> {
    unwrap(await this.supabase.storage.from('store-images').remove([path]));
  }

  imageUrl(path: string): string {
    return storeImageUrl(this.supabase, path);
  }
}
