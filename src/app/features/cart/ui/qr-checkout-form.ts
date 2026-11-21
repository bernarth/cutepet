import { Component, computed, input, output, signal, viewChild } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { CustomerDetails, DELIVERY_LABELS } from '@core/orders/customer-details';
import { Turnstile } from '@shared/ui/turnstile';
import { busParcelPayerText } from '../models/delivery';
import { CheckoutBar } from './checkout-bar';

@Component({
  selector: 'cp-qr-checkout-form',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, Turnstile, CheckoutBar],
  templateUrl: './qr-checkout-form.html',
  styles: `
    :host {
      display: block;
      padding: var(--cp-space-md);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-low);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-sm);
    }
    h2 {
      margin: 0;
      font: var(--mat-sys-title-large);
      font-family: var(--cp-font-display);
    }
    p {
      margin: 0;
    }
    .hint {
      margin-bottom: var(--cp-space-sm);
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .label {
      font: var(--mat-sys-label-large);
    }
    .delivery {
      margin-bottom: var(--cp-space-sm);
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class QrCheckoutForm {
  readonly details = input.required<FieldTree<CustomerDetails>>();
  readonly total = input.required<number>();
  readonly units = input.required<number>();
  readonly shippingPaidByStore = input.required<boolean>();
  readonly needsCaptcha = input.required<boolean>();
  readonly waitingForCaptcha = input.required<boolean>();
  readonly turnstileSiteKey = input.required<string>();
  readonly canReserve = input.required<boolean>();
  readonly isReserving = input.required<boolean>();
  readonly failureMessage = input.required<string | null>();
  readonly captchaToken = output<string | null>();
  readonly reserve = output();
  readonly back = output();

  private readonly turnstile = viewChild(Turnstile);
  protected readonly captchaFailed = signal(false);
  protected readonly isBusParcel = computed(
    () => this.details().deliveryMethod().value() === 'bus_parcel',
  );
  protected readonly deliveryLabel = computed(() => {
    const label = DELIVERY_LABELS[this.details().deliveryMethod().value()];
    return this.isBusParcel()
      ? `${label}, ${busParcelPayerText(this.shippingPaidByStore())}`
      : label;
  });

  /** A Turnstile token works once, so a failed attempt needs a new check */
  resetCaptcha(): void {
    this.turnstile()?.reset();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.reserve.emit();
  }
}
