import { Service, computed, inject, signal } from '@angular/core';
import { form } from '@angular/forms/signals';

import { AuthStore } from '@core/auth/auth.store';
import { RUNTIME_CONFIG } from '@core/config/runtime-config';
import {
  CustomerDetails,
  EMPTY_CUSTOMER_DETAILS,
  customerDetailsSchema,
  toCustomerDetailsRequest,
} from '@core/orders/customer-details';
import { ReserveFailure, reserveFailure } from '../models/qr-checkout';
import { CartCheckStore } from './cart-check.store';
import { CartRepository } from './cart.repository';

/**
 * @description Provided by CartPage next to CartCheckStore. Asks for the customer details and
 * reserves the order. A guest session is created only here, after the Turnstile check
 */
@Service({ autoProvided: false })
export class QrCheckoutStore {
  private readonly auth = inject(AuthStore);
  private readonly repository = inject(CartRepository);
  private readonly check = inject(CartCheckStore);

  private readonly model = signal<CustomerDetails>({ ...EMPTY_CUSTOMER_DETAILS });
  private readonly reserving = signal(false);
  private readonly failure = signal<ReserveFailure | null>(null);

  readonly form = form(this.model, customerDetailsSchema);
  readonly turnstileSiteKey = inject(RUNTIME_CONFIG).turnstileSiteKey;
  readonly captchaToken = signal<string | null>(null);
  readonly isOpen = signal(false);
  readonly isReserving = this.reserving.asReadonly();
  readonly failureMessage = computed(() => this.failure()?.message ?? null);
  readonly needsCaptcha = computed(() => this.auth.user() === null);
  readonly waitingForCaptcha = computed(() => this.needsCaptcha() && this.captchaToken() === null);
  readonly canReserve = computed(
    () =>
      !this.reserving() &&
      this.check.reserveItems().length > 0 &&
      (!this.needsCaptcha() || this.captchaToken() !== null),
  );

  /** Delivery is chosen in the cart summary, so the form starts with that choice */
  open(): void {
    this.form.deliveryMethod().value.set(this.check.delivery());
    this.failure.set(null);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  /**
   * @returns The order code, or null when the form is invalid or the order could not be reserved
   */
  async reserve(): Promise<string | null> {
    this.form().markAsTouched();
    if (this.form().invalid() || !this.canReserve()) {
      return null;
    }

    this.reserving.set(true);
    this.failure.set(null);
    try {
      await this.auth.ensureSession(this.captchaToken() ?? undefined);
      return await this.repository.reserveOrder(
        this.check.reserveItems(),
        toCustomerDetailsRequest(this.model()),
      );
    } catch (error) {
      await this.recover(reserveFailure(error));
      return null;
    } finally {
      this.captchaToken.set(null);
      this.reserving.set(false);
    }
  }

  /**
   * @description Sold pieces are explained by the cart check itself, so only the other failures keep a message
   */
  private async recover(failure: ReserveFailure): Promise<void> {
    if (failure.kind === 'qr_disabled') {
      this.close();
      this.check.reloadSettings();
    }
    if (failure.kind === 'items_changed' || failure.kind === 'reserved') {
      this.close();
      await this.check.revalidate();
    }

    this.failure.set(failure.kind === 'items_changed' ? null : failure);
  }
}
