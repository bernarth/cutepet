import { Service, inject } from '@angular/core';

import { SUPABASE } from '@core/supabase/supabase.client';
import { AppError, unwrap } from '@shared/data-access/supabase-result';
import {
  STORE_SETTINGS_COLUMNS,
  StoreSettings,
  storeDate,
  toStoreSettings,
} from './store-settings';

/**
 * @description The only reader of the public store settings
 */
@Service()
export class SettingsRepository {
  private readonly supabase = inject(SUPABASE);

  async getStoreSettings(): Promise<StoreSettings> {
    const [row] = unwrap(
      await this.supabase.from('settings').select(STORE_SETTINGS_COLUMNS).limit(1),
    );

    if (!row) {
      throw new AppError('Faltan los ajustes de la tienda', 'NOT_FOUND');
    }

    return toStoreSettings(row, storeDate(new Date()));
  }
}
