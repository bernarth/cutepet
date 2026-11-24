import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/**
 * @description Google never comes back when it blocks an embedded browser, so this is shown after the person returns by themselves
 */
@Component({
  selector: 'cp-sign-in-help',
  imports: [MatButtonModule],
  template: `
    <h2>¿No pudiste ingresar con Google?</h2>
    <p>
      Si abriste CutePet desde WhatsApp, Google puede bloquear el ingreso. Toca el menú o el ícono
      de compartir y elige abrir en Chrome o Safari, o copia el enlace y pégalo allí.
    </p>
    @if (hasOrders()) {
      <p>Los pedidos que hiciste aquí siguen guardados en esta ventana.</p>
    }
    <div class="actions">
      <button mat-stroked-button type="button" (click)="copyLink.emit()">Copiar enlace</button>
      <button mat-flat-button type="button" [disabled]="isBusy()" (click)="retry.emit()">
        Volver a intentarlo
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--cp-space-md);
      padding: var(--cp-space-md);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-low);
    }
    h2 {
      margin: 0 0 var(--cp-space-xs);
      font: var(--mat-sys-title-medium);
      font-family: var(--cp-font-display);
    }
    p {
      margin: 0 0 var(--cp-space-sm);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--cp-space-sm);
    }
  `,
})
export class SignInHelp {
  readonly hasOrders = input.required<boolean>();
  readonly isBusy = input.required<boolean>();
  readonly copyLink = output();
  readonly retry = output();
}
