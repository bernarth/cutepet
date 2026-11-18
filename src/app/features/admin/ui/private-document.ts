import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * @description A file from a private bucket. Its signed link is requested only when the admin asks to see it
 */
@Component({
  selector: 'cp-private-document',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (url(); as link) {
      @if (isPdf()) {
        <a mat-stroked-button [href]="link" target="_blank" rel="noopener">
          <mat-icon>open_in_new</mat-icon>
          Abrir {{ label() }} (PDF)
        </a>
      } @else {
        <a [href]="link" target="_blank" rel="noopener" class="preview">
          <img [src]="link" [alt]="label()" />
        </a>
      }
      <p class="hint">El enlace vence en unos minutos.</p>
    } @else {
      <button mat-stroked-button type="button" [disabled]="isLoading()" (click)="show.emit()">
        <mat-icon>visibility</mat-icon>
        Ver {{ label() }}
      </button>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .preview {
      display: block;
      max-width: 320px;
    }
    img {
      display: block;
      width: 100%;
      height: auto;
      border: var(--cp-border-soft);
      border-radius: calc(var(--cp-radius) / 2);
    }
    .hint {
      margin: var(--cp-space-xs) 0 0;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class PrivateDocument {
  readonly label = input.required<string>();
  readonly url = input<string | null>(null);
  readonly isPdf = input(false);
  readonly isLoading = input(false);
  readonly show = output();
}
