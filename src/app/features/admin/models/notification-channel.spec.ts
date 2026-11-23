import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import { Tables } from '@core/supabase/database.types';
import {
  EMPTY_CHANNEL_FORM,
  NotificationChannelFormModel,
  channelFormFrom,
  notificationChannelSchema,
  toChannelChanges,
  toNotificationChannel,
} from './notification-channel';

const row: Tables<'notification_channels_overview'> = {
  id: 3,
  name: 'Celular de la dueña',
  type: 'telegram',
  destination: '123456789',
  events: ['proof_uploaded', 'channel_test'],
  is_active: true,
  created_at: '2026-11-22T12:00:00Z',
  last_error: 'El chat no existe o la persona no envió /start al bot',
};

function errorsOf(model: Partial<NotificationChannelFormModel>) {
  const channelForm = TestBed.runInInjectionContext(() =>
    form(signal({ ...EMPTY_CHANNEL_FORM, ...model }), notificationChannelSchema),
  );
  return {
    valid: channelForm().valid(),
    name: channelForm
      .name()
      .errors()
      .map((error) => error.message),
    chatId: channelForm
      .chatId()
      .errors()
      .map((error) => error.message),
    events: channelForm
      .qrExpiry()
      .errors()
      .map((error) => error.message),
  };
}

describe('toNotificationChannel', () => {
  it('maps a row and drops the internal test event', () => {
    expect(toNotificationChannel(row)).toEqual({
      id: 3,
      name: 'Celular de la dueña',
      chatId: '123456789',
      events: ['proof_uploaded'],
      isActive: true,
      lastError: 'El chat no existe o la persona no envió /start al bot',
    });
  });
});

describe('channel form', () => {
  it('starts with both alerts on and the channel active', () => {
    expect(EMPTY_CHANNEL_FORM).toEqual({
      name: '',
      chatId: '',
      proofUploaded: true,
      qrExpiry: true,
      isActive: true,
    });
  });

  it('fills the form from a channel', () => {
    expect(channelFormFrom(toNotificationChannel(row))).toEqual({
      name: 'Celular de la dueña',
      chatId: '123456789',
      proofUploaded: true,
      qrExpiry: false,
      isActive: true,
    });
  });

  it('turns the form into the database changes, trimmed', () => {
    expect(
      toChannelChanges({
        name: '  Ayudante ',
        chatId: ' -1001234567890 ',
        proofUploaded: false,
        qrExpiry: true,
        isActive: false,
      }),
    ).toEqual({
      name: 'Ayudante',
      destination: '-1001234567890',
      events: ['qr_expiry'],
      is_active: false,
    });
  });
});

describe('notificationChannelSchema', () => {
  it('accepts a person or a group chat ID', () => {
    expect(errorsOf({ name: 'Dueña', chatId: '123456789' }).valid).toBe(true);
    expect(errorsOf({ name: 'Grupo', chatId: '-1001234567890' }).valid).toBe(true);
  });

  it('asks for a name of 2 to 40 characters', () => {
    expect(errorsOf({ name: '  ', chatId: '1' }).name).toEqual(['Escribe un nombre']);
    expect(errorsOf({ name: 'A', chatId: '1' }).name).toEqual(['Mínimo 2 caracteres']);
    expect(errorsOf({ name: 'a'.repeat(41), chatId: '1' }).name).toEqual(['Máximo 40 caracteres']);
  });

  it('accepts only numbers as the chat ID', () => {
    expect(errorsOf({ name: 'Dueña', chatId: '@cutepet' }).chatId).toEqual([
      'El chat ID tiene solo números (los grupos empiezan con -)',
    ]);
    expect(errorsOf({ name: 'Dueña', chatId: '' }).chatId).toContain('Escribe el chat ID');
  });

  it('needs at least one alert', () => {
    expect(
      errorsOf({ name: 'Dueña', chatId: '1', proofUploaded: false, qrExpiry: false }).events,
    ).toEqual(['Elige al menos un aviso']);
  });
});
