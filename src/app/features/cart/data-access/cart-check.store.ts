import { Service, computed, effect, inject, resource, signal, untracked } from '@angular/core';

import { countUnits } from '@core/cart/cart-line';
import { itemsTotal, pickupFee } from '@core/cart/cart-summary';
import { CartStore } from '@core/cart/cart.store';
import { RUNTIME_CONFIG } from '@core/config/runtime-config';
import { whatsappLink } from '@shared/whatsapp/whatsapp-link';
import { CartVariant, reviewCart, toCartItems } from '../models/cart-item';
import { DeliveryMethod } from '../models/delivery';
import { whatsappOrderMessage } from '../models/whatsapp-order';
import { CartRepository } from './cart.repository';

/**
 * @description Provided by CartPage. Checks the stored cart against the database when the cart is
 * restored and on demand. The check also changes the cart (removes sold pieces), so it is an explicit
 * command instead of a resource
 */
@Service({ autoProvided: false })
export class CartCheckStore {
  private readonly cart = inject(CartStore);
  private readonly repository = inject(CartRepository);
  private readonly siteUrl = inject(RUNTIME_CONFIG).siteUrl;

  private readonly settingsResource = resource({ loader: () => this.repository.getSettings() });
  private readonly variants = signal<ReadonlyMap<number, CartVariant> | null>(null);
  private readonly checking = signal(false);
  private readonly checkFailed = signal(false);
  private readonly reviewNotices = signal<readonly string[]>([]);
  private latestCheck = 0;

  readonly delivery = signal<DeliveryMethod>('pickup_point');
  readonly notices = this.reviewNotices.asReadonly();

  readonly settings = computed(() =>
    this.settingsResource.hasValue() ? this.settingsResource.value() : null,
  );
  readonly items = computed(() => {
    const variants = this.variants();
    return variants ? toCartItems(this.cart.lines(), variants) : [];
  });
  readonly hasReserved = computed(() => this.items().some((item) => item.isReserved));

  private readonly orderItems = computed(() =>
    this.items()
      .filter((item) => !item.isReserved)
      .map((item) => ({
        ...item,
        unitPrice: item.variant.unitPrice,
        quantity: item.line.quantity,
      })),
  );
  readonly total = computed(() => itemsTotal(this.orderItems()));
  readonly units = computed(() => countUnits(this.orderItems()));
  readonly pickupFee = computed(() => {
    const settings = this.settings();
    return settings ? pickupFee(this.orderItems(), settings.pickupRule) : 0;
  });

  readonly whatsappUrl = computed(() => {
    const storeNumber = this.settings()?.storeWhatsapp;
    if (!storeNumber) {
      return null;
    }

    const message = whatsappOrderMessage({
      items: this.orderItems().map((item) => ({
        productName: item.variant.productName,
        sizeLabel: item.line.sizeLabel,
        measurements: item.variant.measurements,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        productUrl: `${this.siteUrl}/catalogo/${item.variant.slug}`,
      })),
      total: this.total(),
      units: this.units(),
      delivery: this.delivery(),
      pickupFee: this.pickupFee(),
    });

    return whatsappLink(storeNumber, message);
  });

  readonly isLoading = computed(
    () => this.checking() || !this.cart.restored() || this.settingsResource.isLoading(),
  );
  readonly hasError = computed(
    () => this.checkFailed() || this.settingsResource.status() === 'error',
  );

  constructor() {
    effect(() => {
      if (this.cart.restored()) {
        untracked(() => void this.revalidate());
      }
    });
  }

  /**
   * @description Only the latest check may change the cart. A failed check never touches it
   */
  async revalidate(): Promise<void> {
    const checkId = ++this.latestCheck;
    const lines = this.cart.lines();
    this.checking.set(true);
    this.checkFailed.set(false);

    try {
      const found = await this.repository.findVariants(lines.map((line) => line.variantId));
      if (checkId !== this.latestCheck) {
        return;
      }
      const variants = new Map(found.map((variant) => [variant.id, variant]));
      const review = reviewCart(lines, variants);

      this.cart.remove(review.soldIds);
      review.limits.forEach((limit) => this.cart.limit(limit.variantId, limit.maxQuantity));
      this.reviewNotices.set(review.notices);
      this.variants.set(variants);
    } catch {
      if (checkId === this.latestCheck) {
        this.checkFailed.set(true);
      }
    } finally {
      if (checkId === this.latestCheck) {
        this.checking.set(false);
      }
    }
  }

  retry(): void {
    if (this.settingsResource.status() === 'error') {
      this.settingsResource.reload();
    }
    void this.revalidate();
  }
}
