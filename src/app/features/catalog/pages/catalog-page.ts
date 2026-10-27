import { Component, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { PageMeta } from '@core/seo/page-meta';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { PageHeader } from '@shared/ui/page-header';
import { CatalogStore } from '../data-access/catalog.store';
import { FilterBar, FilterChange } from '../ui/filter-bar';
import { ProductGrid } from '../ui/product-grid';

@Component({
  selector: 'cp-catalog-page',
  imports: [PageHeader, EmptyState, FilterBar, ProductGrid, MatButtonModule, LoadingBar],
  providers: [CatalogStore],
  template: `
    <cp-page-header title="Catálogo" subtitle="Prendas únicas hechas a mano, listas para llevar" />
    <cp-filter-bar
      [groups]="store.filterGroups()"
      [selected]="store.filters()"
      [active]="store.activeFilters()"
      [hasFilters]="store.hasFilters()"
      (changed)="onFilterChange($event)"
      (cleared)="store.clearFilters()"
    />
    <cp-loading-bar [active]="store.isLoading()" label="Cargando prendas" />
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
