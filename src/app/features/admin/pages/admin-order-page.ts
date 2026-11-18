import { ComponentType } from '@angular/cdk/portal';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ConfirmDialog, ConfirmDialogData } from '@shared/ui/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { whatsappLink } from '@shared/whatsapp/whatsapp-link';
import { AdminOrderStore } from '../data-access/admin-order.store';
import { PrivateBucket } from '../data-access/admin-order.repository';
import { AdminOrder } from '../models/admin-order';
import { messagesFor } from '../models/customer-messages';
import { actionDialogText } from '../models/order-action-dialogs';
import { OrderAction, actionLabel, availableActions } from '../models/order-actions';
import { DateTimePipe } from '../ui/date-time.pipe';
import { OrderActionsPanel } from '../ui/order-actions-panel';
import { OrderCustomerPanel } from '../ui/order-customer-panel';
import { OrderItemsPanel } from '../ui/order-items-panel';
import { OrderReceiptPanel } from '../ui/order-receipt-panel';
import { OrderStatusBadge } from '../ui/order-status-badge';
import { OrderTimeline } from '../ui/order-timeline';
import { PrivateDocument } from '../ui/private-document';
import { ReasonDialog, ReasonDialogData } from '../ui/reason-dialog';
import { SaveState } from '../ui/save-state';

const DIALOG_CONFIG = { width: '560px', maxWidth: 'calc(100vw - 32px)' };
const RECEIPT_STATUSES: readonly AdminOrder['status'][] = ['confirmed', 'shipped', 'delivered'];

@Component({
  selector: 'cp-admin-order-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    DateTimePipe,
    EmptyState,
    LoadingBar,
    OrderActionsPanel,
    OrderCustomerPanel,
    OrderItemsPanel,
    OrderReceiptPanel,
    OrderStatusBadge,
    OrderTimeline,
    PrivateDocument,
  ],
  templateUrl: './admin-order-page.html',
  styleUrl: './admin-order-page.scss',
})
export class AdminOrderPage {
  /** Route parameter `:code` */
  readonly code = input.required<string>();

  protected readonly store = inject(AdminOrderStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly saving = new SaveState();
  protected readonly receiptSaving = new SaveState();
  protected readonly isBusy = computed(
    () => this.store.isLoading() || this.saving.isSaving() || this.receiptSaving.isSaving(),
  );

  protected readonly notice = computed(() => {
    const order = this.store.order();
    if (order?.needsAttention) {
      return 'Alguna prenda ya no estaba libre cuando llegó el comprobante. Resuélvelo por WhatsApp antes de confirmar.';
    }
    return order?.status === 'cancelled'
      ? `Motivo de la cancelación: ${order.cancelReason ?? ''}`
      : null;
  });
  protected readonly chatUrl = computed(() => {
    const order = this.store.order();
    return order ? whatsappLink(order.customerPhone, '') : '';
  });

  protected readonly actions = computed(() => {
    const order = this.store.order();
    return order
      ? availableActions(order).map((action) => ({ action, label: actionLabel(action, order) }))
      : [];
  });
  protected readonly messages = computed(() => {
    const order = this.store.order();
    return order
      ? messagesFor(order, this.store.pickupInfo()).map((message) => ({
          label: message.label,
          url: whatsappLink(order.customerPhone, message.text),
        }))
      : [];
  });
  protected readonly canAttachReceipt = computed(() => {
    const order = this.store.order();
    return order?.deliveryMethod === 'bus_parcel' && RECEIPT_STATUSES.includes(order.status);
  });

  /** Signed links are asked for again whenever another order or file is shown */
  protected readonly proofUrl = linkedSignal<string | null | undefined, string | null>({
    source: () => this.store.order()?.paymentProofPath,
    computation: () => null,
  });
  protected readonly receiptUrl = linkedSignal<string | null | undefined, string | null>({
    source: () => this.store.order()?.shippingReceiptPath,
    computation: () => null,
  });
  protected readonly isLoadingDocument = signal(false);

  constructor() {
    effect(() => this.store.load(this.code()));
  }

  protected channelLabel(order: AdminOrder): string {
    return order.channel === 'whatsapp' ? 'Venta rápida' : 'Pedido web';
  }

  protected isPdf(path: string | null): boolean {
    return path?.toLowerCase().endsWith('.pdf') ?? false;
  }

  protected async showDocument(bucket: PrivateBucket, path: string): Promise<void> {
    this.isLoadingDocument.set(true);
    try {
      const url = await this.store.signedUrl(bucket, path);
      (bucket === 'payment-proofs' ? this.proofUrl : this.receiptUrl).set(url);
    } finally {
      this.isLoadingDocument.set(false);
    }
  }

  protected async run(action: OrderAction, order: AdminOrder): Promise<void> {
    const text = actionDialogText(action, order);

    if (text.reasonSuggestions) {
      const data: ReasonDialogData = {
        title: text.title,
        message: text.message,
        confirmLabel: text.confirmLabel,
        suggestions: text.reasonSuggestions,
        save: (reason) => this.reasonAction(action, order, reason),
      };
      if (await this.openDialog(ReasonDialog, data)) {
        this.notify('Pedido actualizado');
      }
      return;
    }

    const data: ConfirmDialogData = { ...text };
    if (await this.openDialog(ConfirmDialog, data)) {
      const change = action === 'confirm' ? this.store.confirm(order) : this.store.advance(order);
      if (await this.saving.run(() => change)) {
        this.notify('Pedido actualizado');
      }
    }
  }

  protected async attachReceipt(photo: File, order: AdminOrder): Promise<void> {
    if (await this.receiptSaving.run(() => this.store.attachShippingReceipt(order, photo))) {
      this.notify('Guía de envío guardada');
    }
  }

  private reasonAction(action: OrderAction, order: AdminOrder, reason: string): Promise<void> {
    switch (action) {
      case 'restore':
        return this.store.restore(order, reason);
      case 'revert':
        return this.store.revert(order, reason);
      default:
        return this.store.cancel(order, reason);
    }
  }

  private async openDialog<TDialog, TData>(
    component: ComponentType<TDialog>,
    data: TData,
  ): Promise<boolean> {
    const result: unknown = await firstValueFrom(
      this.dialog.open(component, { ...DIALOG_CONFIG, data }).afterClosed(),
    );
    return result === true;
  }

  private notify(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000 });
  }
}
