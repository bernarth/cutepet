import { Clipboard } from '@angular/cdk/clipboard';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PricePipe } from '@shared/pipes/price';
import { ConfirmDialog, ConfirmDialogData } from '@shared/ui/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { PageHeader } from '@shared/ui/page-header';
import { CheckoutStore } from '../data-access/checkout.store';
import { checkoutNotice } from '../models/checkout-notice';
import { formatCountdown } from '../models/countdown';
import { ProofUpload } from '../ui/proof-upload';
import { QrCard } from '../ui/qr-card';

const CANCEL_DIALOG: ConfirmDialogData = {
  title: '¿Cancelar tu pedido?',
  message: 'Tus prendas quedarán libres para otras personas. Seguirán en tu carrito.',
  confirmLabel: 'Sí, cancelar',
  cancelLabel: 'Seguir con mi pedido',
};

@Component({
  selector: 'cp-checkout-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    PricePipe,
    PageHeader,
    EmptyState,
    LoadingBar,
    QrCard,
    ProofUpload,
  ],
  providers: [CheckoutStore],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss',
})
export class CheckoutPage {
  /** Order code from the route. Missing on /pagar */
  readonly code = input<string>();

  protected readonly store = inject(CheckoutStore);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly clipboard = inject(Clipboard);

  private readonly lookingUp = signal(false);
  protected readonly isBusy = computed(() => this.store.isLoading() || this.lookingUp());
  protected readonly countdown = computed(() => formatCountdown(this.store.secondsLeft()));
  protected readonly notice = computed(() =>
    this.isBusy() || this.store.hasError() ? null : checkoutNotice(this.store.view()),
  );

  constructor() {
    effect(() => {
      const code = this.code();
      untracked(() => (code ? this.store.load(code) : void this.openCurrentOrder()));
    });
  }

  protected copyCode(code: string): void {
    const copied = this.clipboard.copy(code);
    this.snackBar.open(copied ? 'Código copiado' : 'No se pudo copiar el código', undefined, {
      duration: 3000,
    });
  }

  protected async cancel(): Promise<void> {
    const dialog = this.dialog.open(ConfirmDialog, {
      data: CANCEL_DIALOG,
      maxWidth: 'calc(100vw - 32px)',
    });
    if ((await firstValueFrom(dialog.afterClosed())) !== true) {
      return;
    }

    if (await this.store.cancel()) {
      this.snackBar.open('Cancelamos tu pedido.', undefined, { duration: 5000 });
      await this.router.navigateByUrl('/carrito');
    } else {
      this.snackBar.open('Tu pedido cambió mientras tanto. Revisa cómo quedó.', undefined, {
        duration: 5000,
      });
    }
  }

  /**
   * @description /pagar without a code opens the latest pending or expired order of this customer
   */
  private async openCurrentOrder(): Promise<void> {
    this.lookingUp.set(true);
    try {
      const code = await this.store.findCurrentCode();
      if (code) {
        await this.router.navigate(['/pagar', code], { replaceUrl: true });
      }
    } catch {
      // Nothing to open: the screen says there is no pending payment
    } finally {
      this.lookingUp.set(false);
    }
  }
}
