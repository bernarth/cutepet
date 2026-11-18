import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PrivateDocument } from './private-document';

@Component({
  selector: 'cp-order-receipt-panel',
  imports: [MatButtonModule, MatIconModule, PrivateDocument],
  template: `
    <h2 id="order-receipt">Guía de envío</h2>
    @if (hasReceipt()) {
      <cp-private-document
        label="guía de envío"
        [url]="url()"
        [isLoading]="isLoading()"
        (show)="show.emit()"
      />
    } @else {
      <p class="meta">
        Adjunta la foto de la guía para tenerla en el pedido. Después la mandas por WhatsApp.
      </p>
    }
    <button
      mat-stroked-button
      type="button"
      class="attach"
      [disabled]="isSaving()"
      (click)="picker.click()"
    >
      <mat-icon>add_photo_alternate</mat-icon>
      {{ hasReceipt() ? 'Cambiar guía' : 'Adjuntar guía' }}
    </button>
    <input
      #picker
      type="file"
      accept="image/jpeg,image/png,image/webp"
      hidden
      (change)="pick(picker)"
    />
    @if (errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }
  `,
  styleUrl: './order-panel.scss',
  host: { role: 'region', 'aria-labelledby': 'order-receipt' },
})
export class OrderReceiptPanel {
  readonly hasReceipt = input.required<boolean>();
  readonly url = input<string | null>(null);
  readonly isLoading = input(false);
  readonly isSaving = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly show = output();
  readonly photoPicked = output<File>();

  protected pick(picker: HTMLInputElement): void {
    const [file] = picker.files ?? [];
    picker.value = '';

    if (file) {
      this.photoPicked.emit(file);
    }
  }
}
