import { Component, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { PageMeta } from '@core/seo/page-meta';
import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';
import { SoldGalleryStore } from '../data-access/sold-gallery.store';
import { ProductGrid } from '../ui/product-grid';

@Component({
  selector: 'cp-sold-gallery-page',
  imports: [PageHeader, EmptyState, ProductGrid, RouterLink, MatButtonModule, MatProgressBarModule],
  providers: [SoldGalleryStore],
  template: `
    <cp-page-header
      title="Ya vendidos"
      subtitle="Prendas que ya encontraron dueño. ¿Te gusta alguna? Te hacemos una parecida."
    />
    <a mat-stroked-button routerLink="/personalizado" class="custom"
      >Pide una prenda personalizada</a
    >
    @if (store.isLoading()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando prendas vendidas" />
    }
    @if (store.hasError()) {
      <cp-empty-state icon="info" message="No pudimos cargar la galería." />
    } @else if (store.items().length) {
      <cp-product-grid [products]="store.items()" [showPrices]="false" />
    } @else if (!store.isLoading()) {
      <cp-empty-state icon="favorite" message="Todavía no hay prendas vendidas." />
    }
  `,
  styles: `
    .custom {
      margin-bottom: var(--cp-space-lg);
    }
  `,
})
export class SoldGalleryPage {
  protected readonly store = inject(SoldGalleryStore);
  private readonly pageMeta = inject(PageMeta);

  constructor() {
    effect(() => {
      const [first] = this.store.items();
      this.pageMeta.set({
        title: 'Ya vendidos',
        description: 'Prendas hechas a mano que ya encontraron dueño. Pide una parecida.',
        path: '/vendidos',
        imageUrl: first?.photo?.url,
      });
    });
  }
}
