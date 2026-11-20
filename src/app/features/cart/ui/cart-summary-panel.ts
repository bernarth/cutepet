import { Component, computed, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';

import { PickupRule } from '@core/cart/cart-summary';
import { DeliveryMethod } from '@core/orders/customer-details';
import { PricePipe } from '@shared/pipes/price';
import { pickupRuleText, unitsText } from '../models/delivery';
import { ShippingPromoNotice } from '../models/qr-checkout';

@Component({
  selector: 'cp-cart-summary-panel',
  imports: [MatButtonModule, MatRadioModule, PricePipe],
  templateUrl: './cart-summary-panel.html',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-md);
      padding: var(--cp-space-md);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-low);
    }
    h2 {
      margin: 0;
      font: var(--mat-sys-title-large);
      font-family: var(--cp-font-display);
    }
    .label {
      font: var(--mat-sys-label-large);
    }
    mat-radio-group {
      display: flex;
      flex-direction: column;
      margin-top: calc(-1 * var(--cp-space-sm));
    }
    p {
      margin: 0;
    }
    .total {
      display: flex;
      justify-content: space-between;
      gap: var(--cp-space-sm);
      font: var(--mat-sys-title-medium);
      font-weight: 700;
    }
    .hint {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .order {
      width: 100%;
    }
    .promo {
      margin-top: calc(-1 * var(--cp-space-sm));
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface);
    }
  `,
})
export class CartSummaryPanel {
  readonly total = input.required<number>();
  readonly units = input.required<number>();
  readonly pickupRule = input.required<PickupRule>();
  readonly pickupFee = input.required<number>();
  readonly whatsappUrl = input.required<string | null>();
  readonly hasReserved = input.required<boolean>();
  readonly qrCheckoutAvailable = input.required<boolean>();
  readonly qrDisabledMessage = input.required<string>();
  readonly shippingPromo = input.required<ShippingPromoNotice | null>();
  readonly delivery = model.required<DeliveryMethod>();
  readonly ordered = output();
  readonly recheck = output();
  readonly payWithQr = output();

  protected readonly pickupText = computed(() =>
    pickupRuleText(this.pickupRule(), this.pickupFee()),
  );
  protected readonly unitsLabel = computed(() => unitsText(this.units()));
}
