import { Service, inject } from '@angular/core';

import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap } from '@shared/data-access/supabase-result';
import {
  NotificationChannel,
  NotificationChannelChanges,
  toNotificationChannel,
} from '../models/notification-channel';

/**
 * @description Channels that receive the owner alerts. They are added, edited and deactivated, never deleted
 */
@Service()
export class NotificationChannelsRepository {
  private readonly supabase = inject(SUPABASE);

  async list(): Promise<NotificationChannel[]> {
    const rows = unwrap(
      await this.supabase
        .from('notification_channels_overview')
        .select('*')
        .eq('type', 'telegram')
        .order('created_at'),
    );
    return rows.map(toNotificationChannel);
  }

  async save(id: number | null, changes: NotificationChannelChanges): Promise<void> {
    if (id === null) {
      unwrap(
        await this.supabase.from('notification_channels').insert({ ...changes, type: 'telegram' }),
      );
      return;
    }
    unwrap(await this.supabase.from('notification_channels').update(changes).eq('id', id));
  }

  async setActive(id: number, isActive: boolean): Promise<void> {
    unwrap(
      await this.supabase
        .from('notification_channels')
        .update({ is_active: isActive })
        .eq('id', id),
    );
  }

  async sendTest(id: number): Promise<void> {
    unwrap(await this.supabase.rpc('send_test_notification', { channel_id: id }));
  }
}
