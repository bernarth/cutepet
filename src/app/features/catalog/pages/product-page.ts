import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { PageMeta } from '@core/seo/page-meta';
import { EmptyState } from '@shared/ui/empty-state';
import { ProductStore } from '../data-access/product.store';
import { statusLabel } from '../models/product';
import { productMetaDescription } from '../models/product-meta';
import { PhotoGallery } from '../ui/photo-gallery';
import { SizeCalculator } from '../ui/size-calculator';
import { VariantList } from '../ui/variant-list';

@Component({
  selector: 'cp-product-page',
  imports: [
    CurrencyPipe,
    RouterLink,
    MatButtonModule,
    MatProgressBarModule,
    EmptyState,
    PhotoGallery,
    VariantList,
    SizeCalculator,
  ],
  providers: [ProductStore],
  templateUrl: './product-page.html',
  styles: `
    .layout {
      display: grid;
      gap: var(--cp-space-lg);
    }
    @media (min-width: 800px) {
      .layout {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        align-items: start;
      }
    }
    .info {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-md);
    }
    h1 {
      margin: 0;
      font-family: var(--cp-font-display);
    }
    .price {
      margin: 0;
      font: var(--mat-sys-headline-small);
      font-weight: 700;
    }
    .badge {
      width: fit-content;
      padding: var(--cp-space-xs) var(--cp-space-sm);
      border-radius: var(--cp-radius);
      font: var(--mat-sys-label-large);
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .meta,
    .description {
      margin: 0;
    }
    .meta {
      color: var(--mat-sys-on-surface-variant);
    }
    .sold {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-sm);
      align-items: flex-start;
      padding: var(--cp-space-md);
      border: var(--cp-border);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-low);
    }
    .sold p {
      margin: 0;
      font: var(--mat-sys-title-medium);
    }
    .calculator h2 {
      margin: 0 0 var(--cp-space-sm);
      font: var(--mat-sys-title-medium);
      font-family: var(--cp-font-display);
    }
  `,
})
export class ProductPage {
  protected readonly store = inject(ProductStore);
  private readonly pageMeta = inject(PageMeta);

  protected readonly badge = computed(() => {
    const product = this.store.product();
    return product ? statusLabel(product) : null;
  });

  constructor() {
    effect(() => {
      const product = this.store.product();
      if (product) {
        this.pageMeta.set({
          title: product.name,
          description: productMetaDescription(product),
          path: `/catalogo/${product.slug}`,
          imageUrl: product.photo?.url,
          price: product.status === 'sold_out' ? undefined : product.price,
        });
      } else if (this.store.notFound()) {
        this.pageMeta.set({
          title: 'Prenda no encontrada',
          description: 'Esta prenda no existe o ya no está disponible.',
          path: '/catalogo',
        });
        this.pageMeta.setNotFoundStatus();
      }
    });
  }
}
