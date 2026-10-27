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
          <cp-product-card [product]="product" [priority]="first" />
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--cp-space-md) var(--cp-space-sm);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    @media (min-width: 600px) {
      ul {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--cp-space-lg) var(--cp-space-md);
      }
    }
    @media (min-width: 1024px) {
      ul {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
  `,
})
export class ProductGrid {
  readonly products = input.required<readonly ProductSummary[]>();
}
