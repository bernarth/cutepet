import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldTree, form } from '@angular/forms/signals';

import { SettingsFormModel, settingsSchema } from './settings-form';
import { isoDate } from '@core/dates/date-format';
import { qrExpiryNotice, toSettingsForm } from './settings';

const TODAY = '2026-11-18';

const valid: SettingsFormModel = {
  qrCheckoutEnabled: false,
  qrDisabledMessage: 'Haz tu pedido por WhatsApp.',
  qrImage: '',
  qrExpiresOn: '',
  reservationMinutes: 15,
  validationHours: '',
  storeWhatsapp: '71234567',
  pickupAddress: '',
  pickupHours: '',
  pickupNotice: '',
  pickupFee: 2,
  freePickupMinItems: 3,
  shippingPromoEnabled: false,
  shippingPromoMinItems: null,
  shippingPromoMinTotal: null,
  sizeToleranceCm: 2,
};

function settingsForm(model: SettingsFormModel): FieldTree<SettingsFormModel> {
  return TestBed.runInInjectionContext(() => form(signal(model), settingsSchema(TODAY)));
}

const messages = (field: FieldTree<unknown>) =>
  field()
    .errors()
    .map((error) => error.message);

describe('settings form', () => {
  it('accepts the defaults with QR checkout off and an empty WhatsApp', () => {
    expect(settingsForm(valid)().valid()).toBe(true);
    expect(settingsForm({ ...valid, storeWhatsapp: '' })().valid()).toBe(true);
  });

  it('asks for the image, a future expiry date and the validation hours when QR is on', () => {
    const qrOn = settingsForm({ ...valid, qrCheckoutEnabled: true });

    expect(messages(qrOn.qrImage)).toEqual(['Sube la imagen del QR']);
    expect(messages(qrOn.qrExpiresOn)).toEqual(['Elige hasta cuándo vale el QR']);
    expect(messages(qrOn.validationHours)).toEqual(['Escribe el horario en que validas los pagos']);
    expect(messages(settingsForm({ ...valid, qrExpiresOn: '2026-11-17' }).qrExpiresOn)).toEqual([
      'Esa fecha ya pasó',
    ]);
  });

  it('keeps reservations between 5 and 60 minutes and the tolerance between 0 and 10 cm', () => {
    expect(messages(settingsForm({ ...valid, reservationMinutes: 61 }).reservationMinutes)).toEqual(
      ['Máximo 60 minutos'],
    );
    expect(settingsForm({ ...valid, sizeToleranceCm: 0 })().valid()).toBe(true);
    expect(messages(settingsForm({ ...valid, sizeToleranceCm: 10.5 }).sizeToleranceCm)).toEqual([
      'Máximo 10 cm',
    ]);
  });

  it('accepts only a Bolivian mobile without the country code', () => {
    expect(
      messages(settingsForm({ ...valid, storeWhatsapp: '59171234567' }).storeWhatsapp),
    ).toEqual(['Usa 8 dígitos que empiecen con 6 o 7, sin 591']);
  });

  it('needs at least one shipping promotion condition when the promotion is on', () => {
    const promo = { ...valid, shippingPromoEnabled: true };

    expect(messages(settingsForm(promo).shippingPromoMinItems)).toEqual([
      'Escribe la cantidad de prendas o el monto mínimo',
    ]);
    expect(settingsForm({ ...promo, shippingPromoMinTotal: 300 })().valid()).toBe(true);
  });
});

describe('qrExpiryNotice', () => {
  it('stays quiet until 7 days before and then counts down', () => {
    expect(qrExpiryNotice('2026-11-26', TODAY)).toBeNull();
    expect(qrExpiryNotice('2026-11-25', TODAY)).toBe('El QR vence en 7 días.');
    expect(qrExpiryNotice('2026-11-19', TODAY)).toBe('El QR vence en 1 día.');
    expect(qrExpiryNotice(TODAY, TODAY)).toBe('El QR vence hoy.');
    expect(qrExpiryNotice('2026-11-10', TODAY)).toBe('El QR ya venció. Sube uno nuevo.');
    expect(qrExpiryNotice('', TODAY)).toBeNull();
  });
});

describe('isoDate', () => {
  it('uses the local calendar day', () => {
    expect(isoDate(new Date(2026, 10, 18, 23, 30))).toBe('2026-11-18');
  });
});

describe('toSettingsForm', () => {
  it('shows a number saved with 591 as the 8 local digits', () => {
    const form = toSettingsForm({
      id: true,
      qr_checkout_enabled: false,
      qr_disabled_message: 'x',
      qr_image_path: null,
      qr_expires_on: null,
      reservation_minutes: 15,
      validation_hours: '',
      store_whatsapp: '59170000000',
      pickup_address: '',
      pickup_hours: '',
      pickup_notice: '',
      pickup_fee: 2,
      free_pickup_min_items: 3,
      shipping_promo_enabled: false,
      shipping_promo_min_items: null,
      shipping_promo_min_total: null,
      size_tolerance_cm: 2,
    });

    expect(form.storeWhatsapp).toBe('70000000');
    expect(form.qrImage).toBe('');
  });
});
