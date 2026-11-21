import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { EmptyState } from '@shared/ui/empty-state';
import { ProofUpload } from './proof-upload';

/**
 * @description A payment is never lost: a proof sent after the reservation ran out is still accepted
 */
@Component({
  selector: 'cp-expired-order-card',
  imports: [RouterLink, MatButtonModule, EmptyState, ProofUpload],
  template: `
    <cp-empty-state icon="timer_off" message="Tu reserva venció y tus prendas quedaron libres.">
      <p>
        Si ya pagaste el pedido <strong>{{ code() }}</strong
        >, sube tu comprobante y lo revisamos.
      </p>
      <div class="actions">
        <cp-proof-upload [uploading]="uploading()" [error]="error()" (file)="file.emit($event)" />
        <a mat-stroked-button routerLink="/carrito">Volver a intentarlo</a>
      </div>
    </cp-empty-state>
  `,
  styles: `
    p {
      margin: 0;
      max-width: 420px;
    }
    .actions {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--cp-space-md);
      width: 100%;
      max-width: 320px;
      margin-top: var(--cp-space-sm);
    }
  `,
})
export class ExpiredOrderCard {
  readonly code = input.required<string>();
  readonly uploading = input.required<boolean>();
  readonly error = input.required<string | null>();
  readonly file = output<File>();
}
