import { Component, computed, input } from '@angular/core';

import { PricePipe } from '@shared/pipes/price';
import { unitsText } from '../models/delivery';

/**
 * @description Total plus the main action. Below 768px it is fixed to the bottom of the screen so the
 * main action is always in reach. The global styles add the same space under the page
 */
@Component({
  selector: 'cp-checkout-bar',
  imports: [PricePipe],
  template: `
    <p class="total">
      <span>Total ({{ unitsLabel() }})</span>
      <span class="amount">{{ total() | price }}</span>
    </p>
    <div class="action"><ng-content /></div>
  `,
  styles: `
    :host {
      position: fixed;
      inset-inline: 0;
      bottom: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: var(--cp-space-md);
      box-sizing: border-box;
      min-height: calc(var(--cp-checkout-bar-height) + env(safe-area-inset-bottom, 0px));
      padding: var(--cp-space-sm) var(--cp-space-md)
        calc(var(--cp-space-sm) + env(safe-area-inset-bottom, 0px));
      border-top: var(--cp-border-soft);
      background: var(--mat-sys-surface-container-low);
    }
    .total {
      display: flex;
      flex-direction: column;
      margin: 0;
      font: var(--mat-sys-body-medium);
    }
    .amount {
      font: var(--mat-sys-title-medium);
      font-weight: 700;
    }
    .action {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    @media (min-width: 768px) {
      :host {
        position: static;
        flex-direction: column;
        align-items: stretch;
        min-height: 0;
        padding: 0;
        border: 0;
        background: none;
      }
      .total {
        flex-direction: row;
        justify-content: space-between;
        gap: var(--cp-space-sm);
        font: var(--mat-sys-title-medium);
        font-weight: 700;
      }
    }
  `,
})
export class CheckoutBar {
  readonly total = input.required<number>();
  readonly units = input.required<number>();

  protected readonly unitsLabel = computed(() => unitsText(this.units()));
}
