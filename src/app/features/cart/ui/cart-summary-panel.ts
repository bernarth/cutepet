import { Component, computed, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';

import { PickupRule } from '@core/cart/cart-summary';
import { PricePipe } from '@shared/pipes/price';
import { DeliveryMethod, pickupRuleText, unitsText } from '../models/delivery';

@Component({
  selector: 'cp-cart-summary-panel',
  imports: [MatButtonModule, MatRadioModule, PricePipe],
  template: `
    <h2 id="summary-title">Resumen</h2>

    <span class="label" id="delivery-label">Entrega</span>
    <mat-radio-group
      aria-labelledby="delivery-label"
      [value]="delivery()"
      (change)="delivery.set($event.value)"
    >
      <mat-radio-button value="pickup_point">{{ pickupText() }}</mat-radio-button>
      <mat-radio-button value="bus_parcel">
        Envío por flota a otro departamento: lo pagas en la terminal
      </mat-radio-button>
    </mat-radio-group>

    <p class="total">
      <span>Total ({{ unitsLabel() }})</span>
      <span>{{ total() | price }}</span>
    </p>
    <p class="hint">El costo de la entrega no está incluido en el total.</p>

    @if (!whatsappUrl()) {
      <p class="hint">Muy pronto podrás hacer tu pedido aquí.</p>
    } @else if (units() === 0) {
      <button mat-flat-button class="cp-cta order" type="button" disabled>
        Pedir por WhatsApp
      </button>
      <p class="hint">Tus prendas están reservadas por alguien más en este momento.</p>
    } @else {
      <a
        mat-flat-button
        class="cp-cta order"
        target="_blank"
        rel="noopener"
        [href]="whatsappUrl()"
        (click)="ordered.emit()"
      >
        Pedir por WhatsApp
      </a>
    }

    @if (hasReserved()) {
      <button mat-stroked-button type="button" (click)="recheck.emit()">Revisar de nuevo</button>
    }
  `,
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
  `,
})
export class CartSummaryPanel {
  readonly total = input.required<number>();
  readonly units = input.required<number>();
  readonly pickupRule = input.required<PickupRule>();
  readonly pickupFee = input.required<number>();
  readonly whatsappUrl = input.required<string | null>();
  readonly hasReserved = input.required<boolean>();
  readonly delivery = model.required<DeliveryMethod>();
  readonly ordered = output();
  readonly recheck = output();

  protected readonly pickupText = computed(() =>
    pickupRuleText(this.pickupRule(), this.pickupFee()),
  );
  protected readonly unitsLabel = computed(() => unitsText(this.units()));
}
