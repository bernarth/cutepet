import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { NOTIFICATION_EVENT_LABELS, NotificationChannel } from '../models/notification-channel';

/**
 * @description Telegram channels with their alerts and the error of their latest delivery. Nothing is deleted
 */
@Component({
  selector: 'cp-notification-channel-list',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './notification-channel-list.html',
  styleUrl: './notification-channel-list.scss',
})
export class NotificationChannelList {
  readonly channels = input.required<readonly NotificationChannel[]>();
  readonly busy = input(false);
  readonly edit = output<number>();
  readonly sendTest = output<number>();
  readonly toggleActive = output<number>();

  protected readonly labels = NOTIFICATION_EVENT_LABELS;
}
