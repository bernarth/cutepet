import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * @description Shown under the guest's orders, so they see what will be kept before they go to Google
 */
@Component({
  selector: 'cp-keep-orders-panel',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <h2>Guarda tus pedidos</h2>
    <p>Ingresa con Google para ver tus pedidos desde cualquier celular.</p>
    <button mat-flat-button type="button" [disabled]="isBusy()" (click)="signIn.emit()">
      <mat-icon>login</mat-icon>
      {{ hasOrders() ? 'Ingresar y guardar estos pedidos' : 'Ingresar con Google' }}
    </button>
    @if (hasOrders()) {
      <button mat-button type="button" [disabled]="isBusy()" (click)="notMine.emit()">
        Estos pedidos no son míos
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--cp-space-sm);
      padding: var(--cp-space-md);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-low);
    }
    h2,
    p {
      margin: 0;
    }
    h2 {
      font: var(--mat-sys-title-large);
      font-family: var(--cp-font-display);
    }
  `,
})
export class KeepOrdersPanel {
  readonly hasOrders = input.required<boolean>();
  readonly isBusy = input.required<boolean>();
  readonly signIn = output();
  readonly notMine = output();
}
