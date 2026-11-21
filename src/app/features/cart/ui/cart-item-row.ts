import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { itemsTotal } from '@core/cart/cart-summary';
import { PricePipe } from '@shared/pipes/price';
import { CartItem, RESERVED_NOTE } from '../models/cart-item';

@Component({
  selector: 'cp-cart-item-row',
  imports: [NgOptimizedImage, RouterLink, MatButtonModule, MatIconModule, PricePipe],
  template: `
    <div class="photo" [class.reserved]="item().isReserved">
      @if (item().variant.photo; as photo) {
        <img [ngSrc]="photo.url" [alt]="photo.alt" width="72" height="90" />
      }
    </div>
    <div class="info">
      <a class="name" [routerLink]="['/catalogo', item().variant.slug]">
        {{ item().variant.productName }}
      </a>
      <span class="detail">
        Talla {{ item().line.sizeLabel }}
        @if (item().line.quantity > 1) {
          · {{ item().line.quantity }} unidades
        }
      </span>
      <span class="price">{{ lineTotal() | price }}</span>
      @if (item().isReserved) {
        <span class="reserved-note">{{ reservedNote }}</span>
      }
    </div>
    <button mat-icon-button type="button" [attr.aria-label]="removeLabel()" (click)="remove.emit()">
      <mat-icon>delete</mat-icon>
    </button>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr) auto;
      gap: var(--cp-space-md);
      align-items: start;
      padding: var(--cp-space-md) 0;
    }
    .photo {
      aspect-ratio: 4 / 5;
      overflow: hidden;
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container);
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .reserved img {
      opacity: 0.55;
    }
    .info {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
      min-width: 0;
    }
    .name {
      font: var(--mat-sys-title-small);
      color: inherit;
      overflow-wrap: anywhere;
    }
    .detail,
    .reserved-note {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .price {
      font-weight: 700;
    }
  `,
})
export class CartItemRow {
  readonly item = input.required<CartItem>();
  readonly remove = output();

  protected readonly reservedNote = RESERVED_NOTE;

  protected readonly lineTotal = computed(() =>
    itemsTotal([{ unitPrice: this.item().variant.unitPrice, quantity: this.item().line.quantity }]),
  );
  protected readonly removeLabel = computed(
    () => `Quitar ${this.item().variant.productName} talla ${this.item().line.sizeLabel}`,
  );
}
