import { Clipboard } from '@angular/cdk/clipboard';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

import { ACCOUNT_PATH } from '@core/auth/return-path';
import { RUNTIME_CONFIG } from '@core/config/runtime-config';
import { ConfirmDialog, ConfirmDialogData } from '@shared/ui/confirm-dialog';
import { LoadingBar } from '@shared/ui/loading-bar';
import { PageHeader } from '@shared/ui/page-header';
import { AccountStore } from '../data-access/account.store';
import { GuestTransferStore } from '../data-access/guest-transfer.store';
import { AccountOrders } from '../ui/account-orders';
import { KeepOrdersPanel } from '../ui/keep-orders-panel';
import { SignInHelp } from '../ui/sign-in-help';
import { TransferNoticeCard } from '../ui/transfer-notice-card';
import { VisitorPanel } from '../ui/visitor-panel';

const NOT_MINE_DIALOG: ConfirmDialogData = {
  title: '¿Ingresar sin estos pedidos?',
  message:
    'Dejarán de verse en este navegador. Si alguno es tuyo, guárdalo primero en tu cuenta: después solo podremos encontrarlo por WhatsApp.',
  confirmLabel: 'Sí, ingresar sin ellos',
  cancelLabel: 'Volver',
};

@Component({
  selector: 'cp-account-page',
  imports: [
    MatButtonModule,
    MatIconModule,
    PageHeader,
    LoadingBar,
    AccountOrders,
    KeepOrdersPanel,
    VisitorPanel,
    SignInHelp,
    TransferNoticeCard,
  ],
  providers: [AccountStore, GuestTransferStore],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
  host: { '(window:pageshow)': 'store.checkUnfinishedSignIn()' },
})
export class AccountPage {
  protected readonly store = inject(AccountStore);
  protected readonly transfer = inject(GuestTransferStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly clipboard = inject(Clipboard);
  private readonly accountUrl = `${inject(RUNTIME_CONFIG).siteUrl}${ACCOUNT_PATH}`;

  protected copyLink(): void {
    const copied = this.clipboard.copy(this.accountUrl);
    this.say(copied ? 'Enlace copiado' : 'No se pudo copiar el enlace');
  }

  protected async signIn(): Promise<void> {
    this.sayIfFailed(await this.store.signIn());
  }

  protected async signOut(): Promise<void> {
    if (!(await this.store.signOut())) {
      this.say('No se pudo cerrar la sesión. Inténtalo de nuevo.');
    }
  }

  protected async signInWithoutOrders(): Promise<void> {
    const dialog = this.dialog.open(ConfirmDialog, {
      data: NOT_MINE_DIALOG,
      maxWidth: 'calc(100vw - 32px)',
    });
    if ((await firstValueFrom(dialog.afterClosed())) === true) {
      this.sayIfFailed(await this.store.signInWithoutOrders());
    }
  }

  private sayIfFailed(started: boolean): void {
    if (!started) {
      this.say('No pudimos abrir el ingreso con Google. Inténtalo de nuevo.');
    }
  }

  private say(message: string): void {
    this.snackBar.open(message, undefined, { duration: 5000 });
  }
}
