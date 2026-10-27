import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PricePipe } from '@shared/pipes/price';
import { ProductSummary } from '../models/product';

@Component({
  selector: 'cp-product-card',
  imports: [RouterLink, NgOptimizedImage, PricePipe],
  template: `
    <a class="card" [routerLink]="['/catalogo', product().slug]" [class.reserved]="isReserved()">
      <div class="photo">
        @if (product().photo; as photo) {
          <img
            [ngSrc]="photo.url"
            [alt]="photo.alt"
            fill
            [priority]="priority()"
            sizes="(min-width: 1024px) 25vw, (min-width: 600px) 33vw, 50vw"
          />
        }
        @if (isReserved()) {
          <span class="badge">Alguien la está comprando</span>
        }
      </div>
      <h2 class="name">{{ product().name }}</h2>
      <p class="price">{{ product().price | price }}</p>
    </a>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
      min-width: 0;
      color: inherit;
      text-decoration: none;
      border-radius: var(--cp-radius);
    }
    .photo {
      position: relative;
      aspect-ratio: 4 / 5;
      overflow: hidden;
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container);
    }
    img {
      object-fit: cover;
    }
    .reserved img {
      opacity: 0.55;
    }
    .badge {
      position: absolute;
      inset: auto var(--cp-space-xs) var(--cp-space-xs);
      padding: var(--cp-space-xs) var(--cp-space-sm);
      border-radius: var(--cp-radius);
      font: var(--mat-sys-label-medium);
      text-align: center;
      background: var(--cp-lavender);
      color: var(--cp-ink);
    }
    .name {
      margin: 0;
      font: var(--mat-sys-title-small);
      font-family: var(--cp-font-display);
      overflow-wrap: anywhere;
    }
    .price {
      margin: 0;
      font: var(--mat-sys-body-large);
      font-weight: 700;
    }
    .card:hover .name {
      text-decoration: underline;
    }
    @media (min-width: 600px) {
      .name {
        font: var(--mat-sys-title-medium);
        font-family: var(--cp-font-display);
      }
    }
  `,
})
export class ProductCard {
  readonly product = input.required<ProductSummary>();
  readonly priority = input(false);

  protected readonly isReserved = computed(() => this.product().status === 'reserved');
}
