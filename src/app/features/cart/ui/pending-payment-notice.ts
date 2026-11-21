import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'cp-pending-payment-notice',
  imports: [RouterLink, MatButtonModule],
  template: `
    @if (code(); as code) {
      <p class="notice">
        <span>
          Tienes un pago pendiente: <strong>{{ code }}</strong>
        </span>
        <a mat-flat-button [routerLink]="['/pagar', code]">Continuar</a>
      </p>
    }
  `,
  styles: `
    .notice {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--cp-space-sm) var(--cp-space-md);
      margin: 0 0 var(--cp-space-md);
      padding: var(--cp-space-md);
      border-radius: var(--cp-radius);
      background: var(--cp-lavender);
      color: var(--cp-ink);
    }
  `,
})
export class PendingPaymentNotice {
  readonly code = input.required<string | null>();
}
