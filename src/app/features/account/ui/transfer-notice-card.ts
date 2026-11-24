import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { TransferNotice } from '../models/transfer-notice';

@Component({
  selector: 'cp-transfer-notice-card',
  imports: [MatButtonModule],
  template: `
    <p>{{ notice().message }}</p>
    @switch (notice().kind) {
      @case ('invalid') {
        @if (whatsappUrl(); as url) {
          <a mat-stroked-button [href]="url" target="_blank" rel="noopener">
            Escribir por WhatsApp
          </a>
        }
      }
      @case ('moved') {}
      @default {
        <button mat-stroked-button type="button" (click)="retry.emit()">Reintentar</button>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--cp-space-sm);
      margin-bottom: var(--cp-space-md);
      padding: var(--cp-space-md);
      border-radius: var(--cp-radius);
      background: var(--cp-brand-soft);
      color: var(--cp-ink);
    }
    p {
      margin: 0;
    }
  `,
})
export class TransferNoticeCard {
  readonly notice = input.required<TransferNotice>();
  readonly whatsappUrl = input.required<string | null>();
  readonly retry = output();
}
