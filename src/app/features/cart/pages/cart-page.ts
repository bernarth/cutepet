import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';

import { CartStore } from '@core/cart/cart.store';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { PageHeader } from '@shared/ui/page-header';
import { CartCheckStore } from '../data-access/cart-check.store';
import { CartItemRow } from '../ui/cart-item-row';
import { CartSummaryPanel } from '../ui/cart-summary-panel';

@Component({
  selector: 'cp-cart-page',
  imports: [
    RouterLink,
    MatButtonModule,
    PageHeader,
    EmptyState,
    LoadingBar,
    CartItemRow,
    CartSummaryPanel,
  ],
  providers: [CartCheckStore],
  templateUrl: './cart-page.html',
  styles: `
    .notices {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-sm);
      margin-bottom: var(--cp-space-md);
    }
    .notice {
      margin: 0;
      padding: var(--cp-space-md);
      border-radius: var(--cp-radius);
      background: var(--cp-lavender);
      color: var(--cp-ink);
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--cp-space-lg);
      align-items: start;
    }
    @media (min-width: 768px) {
      .layout {
        grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
      }
      cp-cart-summary-panel {
        position: sticky;
        top: var(--cp-space-lg);
      }
    }
    .items {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .items li + li {
      border-top: var(--cp-border-soft);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--cp-space-sm);
    }
  `,
})
export class CartPage {
  protected readonly cart = inject(CartStore);
  protected readonly check = inject(CartCheckStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly sent = signal(false);

  protected finishOrder(): void {
    this.cart.clear();
    this.snackBar.open('¡Gracias! Te responderemos por WhatsApp.', undefined, { duration: 5000 });
    void this.router.navigateByUrl('/catalogo');
  }
}
