import { Service, computed, inject, resource } from '@angular/core';

import { NotificationChannelFormModel, toChannelChanges } from '../models/notification-channel';
import { NotificationChannelsRepository } from './notification-channels.repository';

/** Long enough for notify to try the test message, so a failure shows in the list */
export const TEST_RESULT_DELAY_MS = 5000;

@Service()
export class NotificationChannelsStore {
  private readonly repository = inject(NotificationChannelsRepository);

  private readonly channelsResource = resource({ loader: () => this.repository.list() });

  readonly channels = computed(() => this.channelsResource.value() ?? []);
  readonly isLoading = this.channelsResource.isLoading;
  readonly hasError = computed(() => this.channelsResource.error() !== undefined);

  reload(): void {
    this.channelsResource.reload();
  }

  async save(id: number | null, model: NotificationChannelFormModel): Promise<void> {
    await this.repository.save(id, toChannelChanges(model));
    this.reload();
  }

  async setActive(id: number, isActive: boolean): Promise<void> {
    await this.repository.setActive(id, isActive);
    this.reload();
  }

  async sendTest(id: number): Promise<void> {
    await this.repository.sendTest(id);
    setTimeout(() => this.reload(), TEST_RESULT_DELAY_MS);
  }
}
