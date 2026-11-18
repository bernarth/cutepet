import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { AdminProductsStore } from '../data-access/admin-products.store';
import { ProductListFilter } from '../models/admin-product';
import { AdminProductCard } from '../ui/admin-product-card';

const FILTER_OPTIONS: readonly { value: ProductListFilter; label: string }[] = [
  { value: 'for_sale', label: 'En venta' },
  { value: 'sold_out', label: 'Agotadas' },
  { value: 'archived', label: 'Archivadas' },
];

@Component({
  selector: 'cp-admin-products-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    EmptyState,
    LoadingBar,
    AdminProductCard,
  ],
  templateUrl: './admin-products-page.html',
  styleUrl: './admin-products-page.scss',
})
export class AdminProductsPage {
  protected readonly store = inject(AdminProductsStore);
  protected readonly filters = FILTER_OPTIONS;

  constructor() {
    this.store.reload();
  }

  protected onSearch(event: Event): void {
    this.store.search.set((event.target as HTMLInputElement).value);
  }
}
