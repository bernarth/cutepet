import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CartStore } from './cart.store';

const STORAGE_KEY = 'cutepet.cart.v1';
const coat = { variantId: 1, productName: 'Abrigo Osito', sizeLabel: '1' };

function setUp(platform: 'browser' | 'server'): CartStore {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  return TestBed.inject(CartStore);
}

describe('CartStore', () => {
  beforeEach(() => localStorage.clear());

  it('restores the stored cart after the first render', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...coat, quantity: 1 }]));
    const store = setUp('browser');

    expect(store.restored()).toBe(false);
    TestBed.tick();
    expect(store.restored()).toBe(true);
    expect(store.unitCount()).toBe(1);
  });

  it('saves every change in the browser', () => {
    const store = setUp('browser');
    TestBed.tick();

    store.add(coat, 1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([
      { ...coat, quantity: 1 },
    ]);

    store.clear();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  it('never touches storage on the server', () => {
    const store = setUp('server');

    store.add(coat, 1);
    expect(store.unitCount()).toBe(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
