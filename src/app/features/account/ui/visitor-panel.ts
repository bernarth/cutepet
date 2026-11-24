import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { EmptyState } from '@shared/ui/empty-state';

@Component({
  selector: 'cp-visitor-panel',
  imports: [MatButtonModule, MatIconModule, EmptyState],
  template: `
    <cp-empty-state
      icon="person"
      message="Ingresa con Google para ver tus pedidos desde cualquier celular. No necesitas una cuenta para comprar."
    >
      <button mat-flat-button type="button" [disabled]="isBusy()" (click)="signIn.emit()">
        <mat-icon>login</mat-icon>
        Ingresar con Google
      </button>
      @if (whatsappUrl(); as url) {
        <a mat-button [href]="url" target="_blank" rel="noopener">Compré en otro celular</a>
      }
    </cp-empty-state>
  `,
})
export class VisitorPanel {
  readonly whatsappUrl = input.required<string | null>();
  readonly isBusy = input.required<boolean>();
  readonly signIn = output();
}
