import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { formatCm } from '@shared/pipes/centimeters';
import { AdminVariant, heldUnits } from '../models/admin-product';

@Component({
  selector: 'cp-variant-card',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <h3>Talla {{ variant().sizeLabel }}</h3>
    <p class="stock">
      Stock {{ variant().stock }}
      @if (held() > 0) {
        · {{ held() }} en pedidos
      }
    </p>
    <p class="measurements">
      @for (part of measurementParts(); track part) {
        <span>{{ part }}</span>
      }
    </p>
    @for (warning of warnings(); track warning) {
      <p class="warning"><mat-icon aria-hidden="true">warning</mat-icon>{{ warning }}</p>
    }
    <div class="actions">
      <button mat-button type="button" (click)="edit.emit()">
        <mat-icon>edit</mat-icon>
        Editar
      </button>
      <button mat-button type="button" (click)="adjustStock.emit()">
        <mat-icon>inventory_2</mat-icon>
        Ajustar stock
      </button>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
      padding: var(--cp-space-md) var(--cp-space-md) var(--cp-space-xs);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-lowest);
    }
    h3,
    p {
      margin: 0;
    }
    h3 {
      font: var(--mat-sys-title-medium);
    }
    .measurements {
      display: flex;
      flex-wrap: wrap;
      gap: 0 var(--cp-space-md);
      color: var(--mat-sys-on-surface-variant);
    }
    .warning {
      display: flex;
      gap: var(--cp-space-xs);
      font: var(--mat-sys-body-small);
    }
    .warning mat-icon {
      flex: none;
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      margin-left: calc(-1 * var(--cp-space-sm));
    }
  `,
})
export class VariantCard {
  readonly variant = input.required<AdminVariant>();
  readonly warnings = input<readonly string[]>([]);
  readonly edit = output();
  readonly adjustStock = output();

  protected readonly held = computed(() => heldUnits(this.variant()));
  protected readonly measurementParts = computed(() => {
    const { neckCm, chestCm, backLengthCm, toleranceCm } = this.variant();
    const parts = [
      neckCm !== null ? `cuello ${formatCm(neckCm)}` : null,
      chestCm !== null ? `pecho ${formatCm(chestCm)}` : null,
      backLengthCm !== null ? `largo ${formatCm(backLengthCm)}` : null,
    ].filter((part) => part !== null);

    return [
      ...(parts.length > 0 ? parts : ['Sin medidas exactas']),
      ...(toleranceCm !== null ? [`tolerancia ${formatCm(toleranceCm)}`] : []),
    ];
  });
}
