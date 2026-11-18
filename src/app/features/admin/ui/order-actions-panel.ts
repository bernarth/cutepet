import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { OrderAction } from '../models/order-actions';

export interface OrderActionButton {
  readonly action: OrderAction;
  readonly label: string;
}

@Component({
  selector: 'cp-order-actions-panel',
  imports: [MatButtonModule],
  template: `
    <h2 id="order-actions">Acciones</h2>
    <div class="buttons">
      @for (item of actions(); track item.action; let first = $first) {
        <button
          [matButton]="first ? 'filled' : 'outlined'"
          type="button"
          [disabled]="isBusy()"
          (click)="run.emit(item.action)"
        >
          {{ item.label }}
        </button>
      }
    </div>
    @if (errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }
  `,
  styleUrl: './order-panel.scss',
  host: { role: 'region', 'aria-labelledby': 'order-actions' },
})
export class OrderActionsPanel {
  readonly actions = input.required<readonly OrderActionButton[]>();
  readonly isBusy = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly run = output<OrderAction>();
}
