import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { CatalogFilterKey, FilterGroup } from '../models/catalog-filters';

export interface FilterChange {
  readonly key: CatalogFilterKey;
  readonly value: string | null;
}

@Component({
  selector: 'cp-filter-bar',
  imports: [MatFormFieldModule, MatSelectModule, MatButtonModule],
  template: `
    <div class="fields">
      @for (group of groups(); track group.key) {
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>{{ group.label }}</mat-label>
          <mat-select
            [value]="selected()[group.key]"
            (selectionChange)="changed.emit({ key: group.key, value: $event.value })"
          >
            <mat-option [value]="null">Todas</mat-option>
            @for (option of group.options; track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
    </div>
    @if (hasFilters()) {
      <button mat-button type="button" (click)="cleared.emit()">Quitar filtros</button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--cp-space-sm);
      margin-bottom: var(--cp-space-lg);
    }
    .fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--cp-space-sm);
      flex: 1 1 100%;
    }
  `,
})
export class FilterBar {
  readonly groups = input.required<readonly FilterGroup[]>();
  readonly selected = input.required<Readonly<Record<CatalogFilterKey, string | null>>>();
  readonly hasFilters = input(false);

  readonly changed = output<FilterChange>();
  readonly cleared = output();
}
