import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PricePipe } from '@shared/pipes/price';
import { SaleLine, SaleOption, isLineAvailable } from '../models/quick-sale';

@Component({
  selector: 'cp-sale-lines',
  imports: [MatButtonModule, MatIconModule, PricePipe],
  template: `
    <ul class="lines">
      @for (line of lines(); track line.variantId) {
        <li class="line" [class.unavailable]="!isAvailable(line)">
          <div class="text">
            <p class="name">{{ line.productName }} · Talla {{ line.sizeLabel }}</p>
            <p class="price">
              @if (line.quantity > 1) {
                {{ line.quantity }} x
              }
              {{ line.unitPrice | price }}
            </p>
            @if (!isAvailable(line)) {
              <p class="warning">Ya no está disponible. Quítala para registrar la venta.</p>
            }
          </div>
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="'Quitar ' + line.productName + ', talla ' + line.sizeLabel"
            (click)="remove.emit(line.variantId)"
          >
            <mat-icon>close</mat-icon>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    .lines {
      display: grid;
      gap: var(--cp-space-xs);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .line {
      display: flex;
      align-items: center;
      gap: var(--cp-space-sm);
      padding: var(--cp-space-xs) var(--cp-space-xs) var(--cp-space-xs) var(--cp-space-md);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-lowest);
    }
    .unavailable {
      border-color: var(--mat-sys-error);
    }
    .text {
      flex: 1;
      min-width: 0;
    }
    p {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .price {
      color: var(--mat-sys-on-surface-variant);
    }
    .warning {
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class SaleLines {
  readonly lines = input.required<readonly SaleLine[]>();
  readonly options = input.required<ReadonlyMap<number, SaleOption>>();
  readonly remove = output<number>();

  protected isAvailable(line: SaleLine): boolean {
    return isLineAvailable(line, this.options());
  }
}
