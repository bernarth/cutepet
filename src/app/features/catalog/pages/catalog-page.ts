import { Component, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { PageMeta } from '@core/seo/page-meta';
import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';
import { CatalogStore } from '../data-access/catalog.store';
import { FilterBar, FilterChange } from '../ui/filter-bar';
import { ProductGrid } from '../ui/product-grid';

@Component({
  selector: 'cp-catalog-page',
  imports: [PageHeader, EmptyState, FilterBar, ProductGrid, MatButtonModule, MatProgressBarModule],
  providers: [CatalogStore],
  template: `
    <cp-page-header
      title="Catálogo"
      subtitle="Prendas hechas a mano, listas para llevar o a pedido"
    />
    <cp-filter-bar
      [groups]="store.filterGroups()"
      [selected]="store.selectedValues()"
      [hasFilters]="store.hasFilters()"
      (changed)="onFilterChange($event)"
      (cleared)="store.clearFilters()"
    />
    @if (store.isLoading()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando prendas" />
    }
    @if (store.hasError()) {
      <cp-empty-state icon="info" message="No pudimos cargar el catálogo.">
        <button mat-button type="button" (click)="store.reload()">Reintentar</button>
      </cp-empty-state>
    } @else if (store.items().length) {
      <cp-product-grid [products]="store.items()" />
    } @else if (!store.isLoading()) {
      <cp-empty-state message="No hay prendas con estos filtros.">
        @if (store.hasFilters()) {
          <button mat-button type="button" (click)="store.clearFilters()">Quitar filtros</button>
        }
      </cp-empty-state>
    }
  `,
})
export class CatalogPage {
  protected readonly store = inject(CatalogStore);
  private readonly pageMeta = inject(PageMeta);

  constructor() {
    effect(() => {
      const [first] = this.store.items();
      this.pageMeta.set({
        title: 'Catálogo',
        description: 'Ropa para perros y gatos hecha a mano en La Paz. Modelos únicos.',
        path: '/catalogo',
        imageUrl: first?.photo?.url,
      });
    });
  }

  protected onFilterChange({ key, value }: FilterChange): void {
    this.store.setFilter(key, value);
  }
}
