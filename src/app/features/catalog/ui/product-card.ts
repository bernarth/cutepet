import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProductSummary, statusLabel } from '../models/product';

@Component({
  selector: 'cp-product-card',
  imports: [RouterLink, NgOptimizedImage, CurrencyPipe],
  template: `
    <a class="card" [routerLink]="['/catalogo', product().slug]">
      <div class="photo">
        @if (product().photo; as photo) {
          <img
            [ngSrc]="photo.url"
            [alt]="photo.alt"
            fill
            [priority]="priority()"
            sizes="(max-width: 600px) 50vw, 25vw"
          />
        }
        @if (badge(); as text) {
          <span class="badge" [class.muted]="product().status !== 'made_to_order'">{{ text }}</span>
        }
      </div>
      <h2 class="name">{{ product().name }}</h2>
      @if (showPrice()) {
        <p class="price">{{ product().price | currency }}</p>
      }
    </a>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
      color: inherit;
      text-decoration: none;
      border-radius: var(--cp-radius);
    }
    .photo {
      position: relative;
      aspect-ratio: 4 / 5;
      overflow: hidden;
      border: var(--cp-border);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container);
    }
    img {
      object-fit: cover;
    }
    .badge {
      position: absolute;
      left: var(--cp-space-sm);
      bottom: var(--cp-space-sm);
      right: var(--cp-space-sm);
      width: fit-content;
      padding: var(--cp-space-xs) var(--cp-space-sm);
      border-radius: var(--cp-radius);
      font: var(--mat-sys-label-medium);
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .badge.muted {
      background: var(--mat-sys-inverse-surface);
      color: var(--mat-sys-inverse-on-surface);
    }
    .name {
      margin: 0;
      font: var(--mat-sys-title-medium);
      font-family: var(--cp-font-display);
    }
    .price {
      margin: 0;
      font: var(--mat-sys-body-large);
      font-weight: 700;
    }
    .card:hover .name {
      text-decoration: underline;
    }
  `,
})
export class ProductCard {
  readonly product = input.required<ProductSummary>();
  readonly showPrice = input(true);
  readonly priority = input(false);

  protected readonly badge = computed(() => statusLabel(this.product()));
}
