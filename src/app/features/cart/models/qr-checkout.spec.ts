import { AuthError } from '@supabase/supabase-js';

import { AppError } from '@shared/data-access/supabase-result';
import { reserveFailure, shippingPromoNotice } from './qr-checkout';

describe('shippingPromoNotice', () => {
  const promo = { minItems: 3, minTotal: 300 };
  const paid = { paidByStore: true, text: '¡Tu envío por flota lo paga CutePet!' };

  it('says nothing when the promotion is off or has no threshold', () => {
    expect(shippingPromoNotice(null, 5, 500)).toBeNull();
    expect(shippingPromoNotice({ minItems: null, minTotal: null }, 5, 500)).toBeNull();
  });

  it('explains the thresholds until the order reaches one', () => {
    expect(shippingPromoNotice(promo, 2, 299)).toEqual({
      paidByStore: false,
      text: 'CutePet paga tu envío por flota desde 3 prendas o Bs 300.',
    });
    expect(shippingPromoNotice({ minItems: null, minTotal: 250.5 }, 1, 100)?.text).toBe(
      'CutePet paga tu envío por flota desde Bs 250,50.',
    );
  });

  it('tells when the items or the total reach the promotion', () => {
    expect(shippingPromoNotice(promo, 3, 120)).toEqual(paid);
    expect(shippingPromoNotice(promo, 1, 300)).toEqual(paid);
  });
});

describe('reserveFailure', () => {
  const unavailable = (detail: string) => new AppError('ITEMS_UNAVAILABLE', 'P0001', detail);

  it('removes sold pieces before telling about reserved ones', () => {
    expect(reserveFailure(unavailable('{"sold": [4], "reserved": [5]}')).kind).toBe(
      'items_changed',
    );
    expect(reserveFailure(new AppError('VARIANT_NOT_FOUND', 'P0001')).kind).toBe('items_changed');
  });

  it('uses the spec message when someone else is paying for a piece', () => {
    expect(reserveFailure(unavailable('{"sold": [], "reserved": [5]}'))).toEqual({
      kind: 'reserved',
      message: 'Alguien está pagando esta prenda, vuelve a intentarlo en unos minutos.',
    });
  });

  it('recognizes QR checkout turned off and a failed captcha', () => {
    expect(reserveFailure(new AppError('QR_CHECKOUT_DISABLED', 'P0001')).kind).toBe('qr_disabled');
    expect(
      reserveFailure(
        new AuthError('captcha protection: request disallowed (captcha verification failed)'),
      ).kind,
    ).toBe('captcha');
  });

  it('falls back to a generic message', () => {
    expect(reserveFailure(new Error('network down')).kind).toBe('other');
    expect(reserveFailure('boom').kind).toBe('other');
  });
});
