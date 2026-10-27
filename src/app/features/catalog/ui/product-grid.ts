import { Component, input } from '@angular/core';

import { ProductSummary } from '../models/product';
import { ProductCard } from './product-card';

@Component({
  selector: 'cp-product-grid',
  imports: [ProductCard],
  template: `
    <ul>
      @for (product of products(); track product.slug; let first = $first) {
        <li>
          <cp-product-card [product]="product" [showPrice]="showPrices()" [priority]="first" />
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(160px, 45%), 1fr));
      gap: var(--cp-space-lg) var(--cp-space-md);
      margin: 0;
      padding: 0;
      list-style: none;
    }
  `,
})
export class ProductGrid {
  readonly products = input.required<readonly ProductSummary[]>();
  readonly showPrices = input(true);
}
