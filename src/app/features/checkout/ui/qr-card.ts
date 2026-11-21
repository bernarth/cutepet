import { NgOptimizedImage } from '@angular/common';
import {
  Component,
  DOCUMENT,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { isAppleTouchDevice } from '../models/apple-touch-device';

/**
 * @description On a phone the customer cannot scan their own screen, so saving the QR and opening it
 * from the bank app ("pagar desde galería") is the main action of the payment screen. Android
 * downloads it to Downloads, which bank apps show. iPhone and iPad get the share sheet
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
  /** Ready before the tap, since Safari only opens the share sheet right after a tap */
  private shareableQr: File | null = null;

  constructor() {
    afterNextRender(() => {
      if (isAppleTouchDevice(navigator)) {
        void this.prepareShare();
      }
    });
  }

  protected async download(): Promise<void> {
    this.saving.set(true);
    this.failed.set(false);
    try {
      if (this.shareableQr) {
        await this.share(this.shareableQr);
      } else {
        this.save(await this.fetchQr());
      }
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  private async prepareShare(): Promise<void> {
    try {
      const qr = await this.fetchQr();
      if (navigator.canShare?.({ files: [qr] })) {
        this.shareableQr = qr;
      }
    } catch {
      // The tap downloads it instead
    }
  }

  private async share(qr: File): Promise<void> {
    try {
      await navigator.share({ files: [qr] });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.save(qr);
      }
    }
  }

  /**
   * @description The image is on another origin, where the download attribute is ignored, so it is
   * fetched first and saved from a local copy
   */
  private async fetchQr(): Promise<File> {
    const response = await fetch(this.imageUrl());
    if (!response.ok) {
      throw new Error(`QR download failed with ${response.status}`);
    }
    const image = await response.blob();
    const extension = image.type === 'image/jpeg' ? 'jpg' : image.type.replace('image/', '');
    return new File([image], `${this.fileName()}.${extension}`, { type: image.type });
  }

  private save(qr: File): void {
    const url = URL.createObjectURL(qr);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = qr.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
