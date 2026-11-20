import { storeDate, toStoreSettings } from './store-settings';

const row = {
  qr_checkout_enabled: true,
  qr_disabled_message: 'Haz tu pedido por WhatsApp.',
  qr_image_path: 'qr/current.png',
  qr_expires_on: '2026-11-20',
  validation_hours: 'Lunes a sábado de 9:00 a 20:00',
  store_whatsapp: '70000000',
  pickup_address: 'Calle 21 de Calacoto',
  pickup_hours: '15:00 a 19:00',
  pickup_notice: 'Después de 1 semana se cobra un extra.',
  pickup_fee: 2,
  free_pickup_min_items: 3,
  shipping_promo_enabled: false,
  shipping_promo_min_items: 3,
  shipping_promo_min_total: 300,
  size_tolerance_cm: 2,
};

describe('storeDate', () => {
  it('uses the La Paz date, not the device or UTC date', () => {
    expect(storeDate(new Date('2026-11-21T03:30:00Z'))).toBe('2026-11-20');
    expect(storeDate(new Date('2026-11-21T04:00:00Z'))).toBe('2026-11-21');
  });
});

describe('toStoreSettings', () => {
  it('offers QR checkout until the end of its expiry date', () => {
    expect(toStoreSettings(row, '2026-11-20').qrCheckoutAvailable).toBe(true);
    expect(toStoreSettings(row, '2026-11-21').qrCheckoutAvailable).toBe(false);
  });

  it('turns QR checkout off when it is disabled or has no QR image', () => {
    expect(
      toStoreSettings({ ...row, qr_checkout_enabled: false }, '2026-11-01').qrCheckoutAvailable,
    ).toBe(false);
    expect(toStoreSettings({ ...row, qr_image_path: null }, '2026-11-01').qrCheckoutAvailable).toBe(
      false,
    );
  });

  it('groups the pickup point data and the pickup rule', () => {
    const settings = toStoreSettings(row, '2026-11-01');

    expect(settings.pickup).toEqual({
      address: 'Calle 21 de Calacoto',
      hours: '15:00 a 19:00',
      notice: 'Después de 1 semana se cobra un extra.',
    });
    expect(settings.pickupRule).toEqual({ fee: 2, freeFromUnits: 3 });
  });

  it('has a shipping promotion only when it is on', () => {
    expect(toStoreSettings(row, '2026-11-01').shippingPromo).toBeNull();
    expect(
      toStoreSettings({ ...row, shipping_promo_enabled: true }, '2026-11-01').shippingPromo,
    ).toEqual({ minItems: 3, minTotal: 300 });
  });
});
