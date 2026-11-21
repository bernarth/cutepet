import { NgOptimizedImage } from '@angular/common';
import { Component, DOCUMENT, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * @description On a phone the customer cannot scan their own screen, so saving the QR and opening it
 * from the bank app ("pagar desde galería") is the main action of the payment screen
 */
@Component({
  selector: 'cp-qr-card',
  imports: [NgOptimizedImage, MatButtonModule, MatIconModule],
  template: `
    <img
      [ngSrc]="imageUrl()"
      [alt]="'Código QR para pagar el pedido ' + code()"
      width="320"
      height="320"
      priority
    />
    <button mat-flat-button class="cp-cta" type="button" [disabled]="saving()" (click)="download()">
      <mat-icon>download</mat-icon>
      Descargar QR
    </button>
    <p class="hint">
      Ábrelo desde la app de tu banco. Si no se descarga, mantén presionado el QR para guardarlo.
    </p>
    @if (failed()) {
      <p class="error" role="alert">
        No pudimos descargar el QR. Mantén presionado el QR para guardarlo.
      </p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--cp-space-sm);
      padding: var(--cp-space-md);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-lowest);
    }
    img {
      width: 100%;
      max-width: 320px;
      height: auto;
      aspect-ratio: 1;
      object-fit: contain;
    }
    button {
      width: 100%;
      max-width: 320px;
    }
    p {
      margin: 0;
      max-width: 320px;
      font: var(--mat-sys-body-medium);
      text-align: center;
    }
    .hint {
      color: var(--mat-sys-on-surface-variant);
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class QrCard {
  readonly imageUrl = input.required<string>();
  readonly code = input.required<string>();

  private readonly document = inject(DOCUMENT);
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  private readonly fileName = computed(() => `QR-CutePet-${this.code()}`);

  /**
   * @description The image is on another origin, where the download attribute is ignored, so it is
   * fetched first and saved from a local copy
   */
  protected async download(): Promise<void> {
    this.saving.set(true);
    this.failed.set(false);
    try {
      const response = await fetch(this.imageUrl());
      if (!response.ok) {
        throw new Error(`QR download failed with ${response.status}`);
      }
      this.save(await response.blob());
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  private save(image: Blob): void {
    const extension = image.type === 'image/jpeg' ? 'jpg' : image.type.replace('image/', '');
    const url = URL.createObjectURL(image);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `${this.fileName()}.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
