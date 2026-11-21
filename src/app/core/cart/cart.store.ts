import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, afterNextRender, computed, inject, signal } from '@angular/core';

import { DeliveryMethod } from '@core/orders/customer-details';

import {
  CartLine,
  NewCartLine,
  addLine,
  countUnits,
  limitQuantity,
  parseStoredCart,
  removeLines,
} from './cart-line';

const STORAGE_KEY = 'cutepet.cart.v1';

/**
 * @description The cart lives only in the browser. The server always renders it empty and the
 * stored lines are restored after hydration, so the server and browser HTML match
 */
@Service()
export class CartStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly storedLines = signal<readonly CartLine[]>([]);
  private readonly isRestored = signal(false);

  readonly lines = this.storedLines.asReadonly();
  readonly restored = this.isRestored.asReadonly();
  readonly unitCount = computed(() => countUnits(this.storedLines()));
  /** Kept in memory only, so it lasts for the visit and is never stored */
  readonly delivery = signal<DeliveryMethod>('pickup_point');

  constructor() {
    afterNextRender(() => {
      this.storedLines.set(parseStoredCart(this.readStorage()));
      this.isRestored.set(true);
    });
  }

  add(item: NewCartLine, availableStock: number): void {
    this.save(addLine(this.storedLines(), item, availableStock));
  }

  remove(variantIds: readonly number[]): void {
    this.save(removeLines(this.storedLines(), variantIds));
  }

  limit(variantId: number, maxQuantity: number): void {
    this.save(limitQuantity(this.storedLines(), variantId, maxQuantity));
  }

  clear(): void {
    this.save([]);
  }

  private save(lines: readonly CartLine[]): void {
    this.storedLines.set(lines);

    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      console.warn('The cart could not be saved in this browser');
    }
  }

  private readStorage(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
