import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { PricePipe } from '@shared/pipes/price';
import { AdminProductSummary } from '../models/admin-product';
import { ProductStatusBadge } from './product-status-badge';

@Component({
  selector: 'cp-admin-product-card',
  imports: [NgOptimizedImage, MatIconModule, RouterLink, PricePipe, ProductStatusBadge],
  template: `
    <a class="card" [routerLink]="['/admin/prendas', product().id]">
      <div class="photo">
        @if (product().photoUrl; as url) {
          <img [ngSrc]="url" alt="" width="72" height="90" />
        } @else {
          <mat-icon aria-hidden="true">checkroom</mat-icon>
        }
      </div>
      <div class="info">
        <h2 class="name">{{ product().name }}</h2>
        <p class="price">{{ product().price | price }}</p>
        <p class="stock">
          <cp-product-status-badge [status]="product().status" />
          @if (product().stockUnits > 0) {
            <span>{{ product().availableUnits }} de {{ product().stockUnits }} disponibles</span>
          }
        </p>
      </div>
    </a>
  `,
  styles: `
    .card {
      display: flex;
      gap: var(--cp-space-md);
      padding: var(--cp-space-sm);
      color: inherit;
      text-decoration: none;
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-lowest);
    }
    .photo {
      position: relative;
      flex: none;
      display: grid;
      place-items: center;
      width: 72px;
      height: 90px;
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
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
      min-width: 0;
    }
    .name {
      margin: 0;
      font: var(--mat-sys-title-medium);
      overflow-wrap: anywhere;
    }
    .price,
    .stock {
      margin: 0;
    }
    .stock {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--cp-space-xs) var(--cp-space-sm);
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class AdminProductCard {
  readonly product = input.required<AdminProductSummary>();
}
