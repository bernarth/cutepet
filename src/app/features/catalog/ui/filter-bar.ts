import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, inject, input, output, viewChild } from '@angular/core';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import {
  ActiveFilter,
  CatalogFilterKey,
  CatalogFilters,
  FilterGroup,
} from '../models/catalog-filters';

export interface FilterChange {
  readonly key: CatalogFilterKey;
  readonly value: string | null;
}

/** Inline selects from 600px. Below that, a "Filtros" button opens a bottom sheet and chips show what is active */
@Component({
  selector: 'cp-filter-bar',
  imports: [
    NgTemplateOutlet,
    MatBottomSheetModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './filter-bar.html',
  styles: `
    :host {
      display: block;
      margin-bottom: var(--cp-space-lg);
    }
    .fields {
      display: grid;
      gap: var(--cp-space-sm);
    }
    .inline {
      display: none;
    }
    .compact {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--cp-space-sm);
    }
    @media (min-width: 600px) {
      .inline {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--cp-space-sm);
      }
      .inline .fields {
        flex: 1 1 100%;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .compact {
        display: none;
      }
    }
    .sheet {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-md);
      padding-block: var(--cp-space-sm);
    }
    .sheet h2 {
      margin: 0;
    }
  `,
})
export class FilterBar {
  readonly groups = input.required<readonly FilterGroup[]>();
  readonly selected = input.required<CatalogFilters>();
  readonly active = input.required<readonly ActiveFilter[]>();
  readonly hasFilters = input(false);

  readonly changed = output<FilterChange>();
  readonly cleared = output();

  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly sheet = viewChild.required<TemplateRef<unknown>>('sheet');

  protected openSheet(): void {
    this.bottomSheet.open(this.sheet(), { ariaLabel: 'Filtros' });
  }

  protected closeSheet(): void {
    this.bottomSheet.dismiss();
  }
}
