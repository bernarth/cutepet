import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PROOF_ACCEPT } from '../models/payment-proof';

/**
 * @description One tap: picking the file starts the upload
 */
@Component({
  selector: 'cp-proof-upload',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <input #picker hidden type="file" [accept]="accept" (change)="pick(picker)" />
    <button mat-flat-button type="button" [disabled]="uploading()" (click)="picker.click()">
      <mat-icon>upload_file</mat-icon>
      {{ uploading() ? 'Subiendo tu comprobante…' : 'Ya pagué, subir comprobante' }}
    </button>
    <p class="hint">Captura o PDF del pago.</p>
    @if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
    }
    p {
      margin: 0;
      font: var(--mat-sys-body-medium);
    }
    .hint {
      color: var(--mat-sys-on-surface-variant);
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class ProofUpload {
  readonly uploading = input.required<boolean>();
  readonly error = input.required<string | null>();
  readonly file = output<File>();

  protected readonly accept = PROOF_ACCEPT;

  /** The picker is cleared so choosing the same file again after an error still triggers a change */
  protected pick(picker: HTMLInputElement): void {
    const file = picker.files?.[0];
    picker.value = '';
    if (file) {
      this.file.emit(file);
    }
  }
}
