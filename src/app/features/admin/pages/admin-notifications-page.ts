import { ComponentType } from '@angular/cdk/portal';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

import { ConfirmDialog, ConfirmDialogData } from '@shared/ui/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { NotificationChannelsStore } from '../data-access/notification-channels.store';
import { EMPTY_CHANNEL_FORM, channelFormFrom } from '../models/notification-channel';
import {
  NotificationChannelDialog,
  NotificationChannelDialogData,
} from '../ui/notification-channel-dialog';
import { NotificationChannelList } from '../ui/notification-channel-list';
import { SaveState } from '../ui/save-state';

const DIALOG_CONFIG = { width: '560px', maxWidth: 'calc(100vw - 32px)' };

@Component({
  selector: 'cp-admin-notifications-page',
  imports: [MatButtonModule, MatIconModule, EmptyState, LoadingBar, NotificationChannelList],
  template: `
    <h1>Notificaciones</h1>
    <p class="intro">
      Quién recibe por Telegram los avisos de comprobantes y del vencimiento del QR. Los canales se
      desactivan, nunca se borran.
    </p>
    <cp-loading-bar [active]="store.isLoading() || saving.isSaving()" />
    @if (saving.errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }

    @if (store.hasError()) {
      <cp-empty-state icon="info" message="No pudimos cargar los canales.">
        <button mat-button type="button" (click)="store.reload()">Reintentar</button>
      </cp-empty-state>
    } @else {
      <button mat-stroked-button type="button" (click)="edit(null)">
        <mat-icon>add</mat-icon>
        Agregar canal
      </button>
      @if (store.channels().length === 0 && !store.isLoading()) {
        <cp-empty-state icon="notifications" message="Todavía nadie recibe avisos." />
      } @else {
        <cp-notification-channel-list
          [channels]="store.channels()"
          [busy]="saving.isSaving()"
          (edit)="edit($event)"
          (sendTest)="sendTest($event)"
          (toggleActive)="toggleActive($event)"
        />
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-md);
      max-width: 720px;
    }
    h1 {
      margin: 0;
      font-family: var(--cp-font-display);
    }
    .intro {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
    :host > button {
      align-self: flex-start;
    }
    .error {
      margin: 0;
      color: var(--mat-sys-error);
    }
  `,
})
export class AdminNotificationsPage {
  protected readonly store = inject(NotificationChannelsStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly saving = new SaveState();

  constructor() {
    this.store.reload();
  }

  protected async edit(id: number | null): Promise<void> {
    const channel = this.store.channels().find((candidate) => candidate.id === id) ?? null;
    const data: NotificationChannelDialogData = {
      title: channel ? `Editar ${channel.name}` : 'Agregar canal de Telegram',
      model: channel ? channelFormFrom(channel) : { ...EMPTY_CHANNEL_FORM },
      save: (model) => this.store.save(id, model),
    };

    if (await this.open(NotificationChannelDialog, data)) {
      this.notify('Canal guardado');
    }
  }

  protected async sendTest(id: number): Promise<void> {
    if (await this.saving.run(() => this.store.sendTest(id))) {
      this.notify('Enviamos una prueba. Revisa Telegram.');
    }
  }

  protected async toggleActive(id: number): Promise<void> {
    const channel = this.store.channels().find((candidate) => candidate.id === id);
    if (!channel || (channel.isActive && !(await this.confirmDeactivate(channel.name)))) {
      return;
    }
    if (await this.saving.run(() => this.store.setActive(id, !channel.isActive))) {
      this.notify(channel.isActive ? 'Canal desactivado' : 'Canal activado');
    }
  }

  private confirmDeactivate(name: string): Promise<boolean> {
    const data: ConfirmDialogData = {
      title: `Desactivar ${name}`,
      message: 'Este canal dejará de recibir avisos hasta que lo actives otra vez.',
      confirmLabel: 'Desactivar',
    };
    return this.open(ConfirmDialog, data);
  }

  private async open<TDialog, TData>(
    component: ComponentType<TDialog>,
    data: TData,
  ): Promise<boolean> {
    const result: unknown = await firstValueFrom(
      this.dialog.open(component, { ...DIALOG_CONFIG, data }).afterClosed(),
    );
    return result === true;
  }

  private notify(message: string): void {
    this.snackBar.open(message, undefined, { duration: 4000 });
  }
}
