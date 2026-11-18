import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PricePipe } from '@shared/pipes/price';
import { SaleLine, SaleOption, SaleProduct } from '../models/quick-sale';

@Component({
  selector: 'cp-sale-product-picker',
  imports: [NgOptimizedImage, MatButtonModule, MatIconModule, PricePipe],
  template: `
    <ul class="products">
      @for (product of products(); track product.id) {
        <li class="product">
          <div class="photo">
            @if (product.photoUrl; as url) {
              <img [ngSrc]="url" alt="" width="48" height="60" />
            } @else {
              <mat-icon aria-hidden="true">checkroom</mat-icon>
            }
          </div>
          <div class="info">
            <p class="name">{{ product.name }} · {{ product.price | price }}</p>
            <div class="sizes">
              @for (option of product.options; track option.variantId) {
                <button
                  mat-stroked-button
                  type="button"
                  [disabled]="(added().get(option.variantId) ?? 0) >= option.available"
                  [attr.aria-label]="'Agregar ' + product.name + ', talla ' + option.sizeLabel"
                  (click)="add.emit(option)"
                >
                  Talla {{ option.sizeLabel }}
                </button>
              }
            </div>
          </div>
        </li>
      } @empty {
        <li class="empty">No hay prendas disponibles con ese nombre.</li>
      }
    </ul>
  `,
  styles: `
    .products {
      display: grid;
      gap: var(--cp-space-xs);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .product {
      display: flex;
      gap: var(--cp-space-sm);
      padding: var(--cp-space-sm);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-lowest);
    }
    .photo {
      flex: none;
      display: grid;
      place-items: center;
      width: 48px;
      height: 60px;
      overflow: hidden;
      border-radius: calc(var(--cp-radius) / 2);
      background: var(--mat-sys-surface-container);
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .info {
      min-width: 0;
    }
    .name {
      margin: 0 0 var(--cp-space-xs);
      overflow-wrap: anywhere;
    }
    .sizes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--cp-space-xs);
    }
    .empty {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class SaleProductPicker {
  readonly products = input.required<readonly SaleProduct[]>();
  readonly lines = input.required<readonly SaleLine[]>();
  readonly add = output<SaleOption>();

  protected readonly added = computed(
    () => new Map(this.lines().map((line) => [line.variantId, line.quantity])),
  );
}
