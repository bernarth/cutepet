import { Component, input, model } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { Variant } from '../models/product';

@Component({
  selector: 'cp-size-picker',
  imports: [MatButtonToggleModule],
  template: `
    <span class="label" id="size-picker-label">Talla</span>
    <mat-button-toggle-group
      aria-labelledby="size-picker-label"
      hideSingleSelectionIndicator
      [value]="selectedId()"
      (change)="selectedId.set($event.value)"
    >
      @for (variant of variants(); track variant.id) {
        <mat-button-toggle [value]="variant.id" [disabled]="variant.isReserved">
          {{ variant.sizeLabel }}
        </mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
    }
    .label {
      font: var(--mat-sys-label-large);
    }
    mat-button-toggle-group {
      flex-wrap: wrap;
      width: fit-content;
      max-width: 100%;
    }
  `,
})
export class SizePicker {
  readonly variants = input.required<readonly Variant[]>();
  readonly selectedId = model<number | null>(null);
}
