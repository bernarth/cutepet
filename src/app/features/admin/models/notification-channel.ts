import { maxLength, pattern, schema, validate } from '@angular/forms/signals';

import { Database, Tables } from '@core/supabase/database.types';
import { requiredText } from '@shared/forms/form-rules';

type NotificationEvent = Database['public']['Enums']['notification_event'];

/** channel_test is only sent by "Enviar prueba", nobody subscribes to it */
export type SubscribableEvent = Exclude<NotificationEvent, 'channel_test'>;

export const NOTIFICATION_EVENT_LABELS: Readonly<Record<SubscribableEvent, string>> = {
  proof_uploaded: 'Comprobante subido',
  qr_expiry: 'Vencimiento del QR',
};

/** Telegram only for now. Email channels arrive with the email step */
export interface NotificationChannel {
  readonly id: number;
  readonly name: string;
  readonly chatId: string;
  readonly events: readonly SubscribableEvent[];
  readonly isActive: boolean;
  readonly lastError: string | null;
}

export interface NotificationChannelFormModel {
  name: string;
  chatId: string;
  proofUploaded: boolean;
  qrExpiry: boolean;
  isActive: boolean;
}

export const EMPTY_CHANNEL_FORM: NotificationChannelFormModel = {
  name: '',
  chatId: '',
  proofUploaded: true,
  qrExpiry: true,
  isActive: true,
};

export const notificationChannelSchema = schema<NotificationChannelFormModel>((path) => {
  requiredText(path.name, 'Escribe un nombre');
  validate(path.name, ({ value }) =>
    value().trim().length === 1 ? { kind: 'minLength', message: 'Mínimo 2 caracteres' } : undefined,
  );
  maxLength(path.name, 40, { message: 'Máximo 40 caracteres' });
  requiredText(path.chatId, 'Escribe el chat ID');
  pattern(path.chatId, /^\s*-?[0-9]{1,20}\s*$/, {
    message: 'El chat ID tiene solo números (los grupos empiezan con -)',
  });
  validate(path.qrExpiry, ({ value, valueOf }) =>
    !value() && !valueOf(path.proofUploaded)
      ? { kind: 'events', message: 'Elige al menos un aviso' }
      : undefined,
  );
});

export function toNotificationChannel(
  row: Tables<'notification_channels_overview'>,
): NotificationChannel {
  return {
    id: row.id,
    name: row.name,
    chatId: row.destination,
    events: row.events.filter((event): event is SubscribableEvent => event !== 'channel_test'),
    isActive: row.is_active,
    lastError: row.last_error,
  };
}

export function channelFormFrom(channel: NotificationChannel): NotificationChannelFormModel {
  return {
    name: channel.name,
    chatId: channel.chatId,
    proofUploaded: channel.events.includes('proof_uploaded'),
    qrExpiry: channel.events.includes('qr_expiry'),
    isActive: channel.isActive,
  };
}

export interface NotificationChannelChanges {
  readonly name: string;
  readonly destination: string;
  readonly events: SubscribableEvent[];
  readonly is_active: boolean;
}

export function toChannelChanges(model: NotificationChannelFormModel): NotificationChannelChanges {
  const events: SubscribableEvent[] = [];
  if (model.proofUploaded) events.push('proof_uploaded');
  if (model.qrExpiry) events.push('qr_expiry');

  return {
    name: model.name.trim(),
    destination: model.chatId.trim(),
    events,
    is_active: model.isActive,
  };
}
