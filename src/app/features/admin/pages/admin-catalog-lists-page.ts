import { ComponentType } from '@angular/cdk/portal';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { firstValueFrom } from 'rxjs';

import { MEASUREMENTS, MEASUREMENT_LABELS } from '@core/catalog/size';
import { formatCmRange } from '@shared/pipes/centimeters';
import { ConfirmDialog, ConfirmDialogData } from '@shared/ui/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state';
import { LoadingBar } from '@shared/ui/loading-bar';
import { CatalogListsStore } from '../data-access/catalog-lists.store';
import {
  LOOKUP_NAMES,
  LookupItem,
  LookupTable,
  SizeItem,
  sizeFormFrom,
  usageWarning,
} from '../models/catalog-lists';
import { nextSortOrder } from '../models/sort-order';
import { CatalogList, CatalogListRow } from '../ui/catalog-list';
import { LookupDialog, LookupDialogData } from '../ui/lookup-dialog';
import { SaveState } from '../ui/save-state';
import { SizeDialog, SizeDialogData } from '../ui/size-dialog';

const DIALOG_CONFIG = { width: '560px', maxWidth: 'calc(100vw - 32px)' };

@Component({
  selector: 'cp-admin-catalog-lists-page',
  imports: [MatButtonModule, MatIconModule, MatTabsModule, EmptyState, LoadingBar, CatalogList],
  templateUrl: './admin-catalog-lists-page.html',
  styleUrl: './admin-catalog-lists-page.scss',
})
export class AdminCatalogListsPage {
  protected readonly store = inject(CatalogListsStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly saving = new SaveState();
  protected readonly names = LOOKUP_NAMES;
  protected readonly categoryRows = computed(() => this.store.categories().map(toLookupRow));
  protected readonly petTypeRows = computed(() => this.store.petTypes().map(toLookupRow));
  protected readonly sizeRows = computed(() => this.store.sizes().map(toSizeRow));

  constructor() {
    this.store.reload();
  }

  protected async editLookup(table: LookupTable, id: number | null): Promise<void> {
    const items = this.store.items(table);
    const item = items.find((candidate) => candidate.id === id) ?? null;
    const singular = this.names[table].singular;
    const data: LookupDialogData = {
      title: item ? `Editar ${singular}` : `Agregar ${singular}`,
      model: { name: item?.name ?? '', sortOrder: item?.sortOrder ?? nextSortOrder(items) },
      uniqueMessage: `Ya existe una ${singular} con ese nombre.`,
      save: (model) => this.store.saveLookup(table, id, model),
    };

    if (await this.open(LookupDialog, data)) {
      this.notify('Guardado');
    }
  }

  protected async editSize(id: number | null): Promise<void> {
    const sizes = this.store.sizes();
    const size = sizes.find((candidate) => candidate.id === id) ?? null;
    const data: SizeDialogData = {
      title: size ? `Editar talla ${size.label}` : 'Agregar talla',
      model: sizeFormFrom(size, nextSortOrder(sizes)),
      save: (model) => this.store.saveSize(id, model),
    };

    if (await this.open(SizeDialog, data)) {
      this.notify('Talla guardada');
    }
  }

  protected async toggleLookup(table: LookupTable, id: number): Promise<void> {
    const item = this.store.items(table).find((candidate) => candidate.id === id);
    if (item && (await this.confirmToggle(item, this.names[table].singular))) {
      await this.runToggle(() => this.store.setLookupActive(table, id, !item.active), item.active);
    }
  }

  protected async toggleSize(id: number): Promise<void> {
    const size = this.store.sizes().find((candidate) => candidate.id === id);
    if (size && (await this.confirmToggle(size, 'talla'))) {
      await this.runToggle(() => this.store.setSizeActive(id, !size.active), size.active);
    }
  }

  /**
   * @description Activating needs no confirmation. Deactivating warns how many products use it, without blocking
   */
  private async confirmToggle(item: LookupItem | SizeItem, itemName: string): Promise<boolean> {
    if (!item.active) {
      return true;
    }
    const data: ConfirmDialogData = {
      title: `Desactivar ${itemName}`,
      message: `${usageWarning(item.productCount, itemName)} Ya no aparecerá en los filtros de la tienda ni al crear o editar prendas.`,
      confirmLabel: 'Desactivar',
    };
    return this.open(ConfirmDialog, data);
  }

  private async runToggle(change: () => Promise<void>, wasActive: boolean): Promise<void> {
    if (await this.saving.run(change)) {
      this.notify(wasActive ? 'Desactivada' : 'Activada otra vez');
    }
  }

  private async open<TDialog, TData>(
    component: ComponentType<TDialog>,
    data: TData,
  ): Promise<boolean> {
    const result: unknown = await firstValueFrom(
      this.dialog.open(component, { ...DIALOG_CONFIG, data }).afterClosed(),
    );
    return result === true;
  }

  private notify(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000 });
  }
}

function toLookupRow(item: LookupItem): CatalogListRow {
  return {
    id: item.id,
    title: item.name,
    detail: `Posición ${item.sortOrder} · ${productsText(item.productCount)}`,
    active: item.active,
  };
}

function toSizeRow(size: SizeItem): CatalogListRow {
  const ranges = MEASUREMENTS.map(
    (measurement) =>
      `${MEASUREMENT_LABELS[measurement]} ${formatCmRange(size[measurement].min, size[measurement].max)}`,
  );
  return {
    id: size.id,
    title: `Talla ${size.label}`,
    detail: `${ranges.join(' · ')} · ${productsText(size.productCount)}`,
    active: size.active,
  };
}

function productsText(count: number): string {
  return count === 1 ? '1 prenda publicada' : `${count} prendas publicadas`;
}
