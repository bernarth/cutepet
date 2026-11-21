import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';

import { CartStore } from '@core/cart/cart.store';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { PageHeader } from '@shared/ui/page-header';
import { CartCheckStore } from '../data-access/cart-check.store';
import { QrCheckoutStore } from '../data-access/qr-checkout.store';
import { RESERVED_NOTE } from '../models/cart-item';
import { CartItemRow } from '../ui/cart-item-row';
import { CartSummaryPanel } from '../ui/cart-summary-panel';
import { PendingPaymentNotice } from '../ui/pending-payment-notice';
import { QrCheckoutForm } from '../ui/qr-checkout-form';

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
    QrCheckoutForm,
    PendingPaymentNotice,
  ],
  providers: [CartCheckStore, QrCheckoutStore],
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
      cp-cart-summary-panel,
      cp-qr-checkout-form {
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
  protected readonly qr = inject(QrCheckoutStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly injector = inject(Injector);

  protected readonly sent = signal(false);
  private readonly checkoutForm = viewChild(QrCheckoutForm);
  private readonly itemRows = viewChildren(CartItemRow, { read: ElementRef });

  protected async reserve(): Promise<void> {
    const code = await this.qr.reserve();

    if (code) {
      await this.router.navigate(['/pagar', code]);
    } else if (this.qr.failureKind() === 'reserved') {
      this.showReservedItem();
    } else if (this.qr.needsCaptcha() && this.qr.captchaToken() === null) {
      this.checkoutForm()?.resetCaptcha();
    }
  }

  /**
   * @description The form closes and the reserved piece explains itself in its row, so the customer is
   * taken to that row and screen readers hear the same note
   */
  private showReservedItem(): void {
    const items = this.check.items();
    const index = items.findIndex((item) => item.isReserved);
    if (index === -1) {
      return;
    }

    void this.announcer.announce(`${items[index].variant.productName}: ${RESERVED_NOTE}`);
    afterNextRender(
      () => this.itemRows()[index]?.nativeElement.scrollIntoView({ block: 'center' }),
      { injector: this.injector },
    );
  }

  protected finishOrder(): void {
    this.cart.clear();
    this.snackBar.open('¡Gracias! Te responderemos por WhatsApp.', undefined, { duration: 5000 });
    void this.router.navigateByUrl('/catalogo');
  }
}
