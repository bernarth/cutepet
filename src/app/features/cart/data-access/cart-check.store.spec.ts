import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CartLine } from '@core/cart/cart-line';
import { RUNTIME_CONFIG, RuntimeConfig } from '@core/config/runtime-config';
import { SettingsRepository } from '@core/settings/settings.repository';
import { StoreSettings } from '@core/settings/store-settings';
import { CartStore } from '@core/cart/cart.store';
import { CartVariant } from '../models/cart-item';
import { CartCheckStore } from './cart-check.store';
import { CartRepository } from './cart.repository';

const STORAGE_KEY = 'cutepet.cart.v1';

const runtimeConfig: RuntimeConfig = {
  siteUrl: 'http://localhost:4200',
  supabaseUrl: 'http://127.0.0.1:54321',
  supabasePublishableKey: 'sb_publishable_test',
  turnstileSiteKey: '1x00000000000000000000AA',
  noIndex: true,
};

const settings: StoreSettings = {
  qrCheckoutAvailable: false,
  qrDisabledMessage: '',
  qrImagePath: null,
  validationHours: '',
  storeWhatsapp: '70000000',
  pickup: { address: '', hours: '', notice: '' },
  pickupRule: { fee: 2, freeFromUnits: 3 },
  shippingPromo: null,
  sizeToleranceCm: 2,
};

function line(variantId: number, productName: string, quantity = 1): CartLine {
  return { variantId, quantity, productName, sizeLabel: '1' };
}

function variant(id: number, stock: number, availableStock: number): CartVariant {
  return {
    id,
    stock,
    availableStock,
    productName: `Prenda ${id}`,
    slug: `prenda-${id}`,
    unitPrice: 100,
    photo: null,
    measurements: { neck: null, chest: null, backLength: null },
  };
}

const coat = line(1, 'Abrigo');
const sweater = line(2, 'Chompa');
const poncho = line(3, 'Poncho', 3);
const dress = line(4, 'Vestido');

async function setUp(lines: readonly CartLine[], findVariants: CartRepository['findVariants']) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: RUNTIME_CONFIG, useValue: runtimeConfig },
      { provide: CartRepository, useValue: { findVariants } },
      { provide: SettingsRepository, useValue: { getStoreSettings: async () => settings } },
      CartCheckStore,
    ],
  });
  const check = TestBed.inject(CartCheckStore);
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();

  return { check, cart: TestBed.inject(CartStore) };
}

function storedLines(): CartLine[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
}

describe('CartCheckStore', () => {
  beforeEach(() => localStorage.clear());

  it('removes a sold piece and says so', async () => {
    const { check, cart } = await setUp([coat, dress], async () => [variant(1, 1, 1)]);

    expect(cart.lines()).toEqual([coat]);
    expect(storedLines()).toEqual([coat]);
    expect(check.notices()).toEqual(['Esta prenda ya fue vendida: Vestido (Talla 1)']);
  });

  it('keeps a reserved piece out of the totals and the WhatsApp message', async () => {
    const { check, cart } = await setUp([coat, sweater], async () => [
      variant(1, 1, 1),
      variant(2, 1, 0),
    ]);

    expect(cart.lines()).toEqual([coat, sweater]);
    expect(check.items().map((item) => item.isReserved)).toEqual([false, true]);
    expect(check.total()).toBe(100);
    expect(check.units()).toBe(1);

    const message = decodeURIComponent(check.whatsappUrl()?.split('text=')[1] ?? '');
    expect(message).toContain('Prenda 1');
    expect(message).not.toContain('Prenda 2');
  });

  it('lowers a quantity above the units left', async () => {
    const { check, cart } = await setUp([poncho], async () => [variant(3, 3, 2)]);

    expect(cart.lines()).toEqual([{ ...poncho, quantity: 2 }]);
    expect(check.notices()).toEqual(['Solo queda 2 de Poncho (Talla 1)']);
  });

  it('leaves the cart unchanged when the query fails', async () => {
    const { check, cart } = await setUp([coat, dress], async () => {
      throw new Error('network');
    });

    expect(check.hasError()).toBe(true);
    expect(cart.lines()).toEqual([coat, dress]);
    expect(storedLines()).toEqual([coat, dress]);
    expect(check.notices()).toEqual([]);
  });

  it('remembers the delivery choice in memory when the cart page is opened again', async () => {
    const { check, cart } = await setUp([coat], async () => [variant(1, 1, 1)]);
    check.delivery.set('bus_parcel');

    const reopened = TestBed.runInInjectionContext(() => new CartCheckStore());

    expect(reopened.delivery()).toBe('bus_parcel');
    expect(cart.delivery()).toBe('bus_parcel');
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('bus_parcel');
  });

  it('ignores a slower older check that answers after a newer one', async () => {
    const answers: ((variants: CartVariant[]) => void)[] = [];
    const findVariants = () => new Promise<CartVariant[]>((resolve) => answers.push(resolve));
    const { check, cart } = await setUp([coat], findVariants);

    const newer = check.revalidate();
    answers[1]([variant(1, 1, 1)]);
    await newer;
    answers[0]([]);
    await new Promise((resolve) => setTimeout(resolve));

    expect(cart.lines()).toEqual([coat]);
    expect(check.notices()).toEqual([]);
    expect(check.isLoading()).toBe(false);
  });
});
