import { maxLength, min, required, schema, validate } from '@angular/forms/signals';

import { MEASUREMENTS, MEASUREMENT_LABELS, Size } from '@core/catalog/size';
import { maxDecimals, requiredText } from './form-rules';

export type LookupTable = 'categories' | 'pet_types';

export const LOOKUP_NAMES: Readonly<Record<LookupTable, { singular: string; plural: string }>> = {
  categories: { singular: 'categoría', plural: 'Categorías' },
  pet_types: { singular: 'tipo de mascota', plural: 'Mascotas' },
};

/** A category or a pet type, with how many published products use it */
export interface LookupItem {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly sortOrder: number;
  readonly active: boolean;
  readonly productCount: number;
}

export interface SizeItem extends Size {
  readonly active: boolean;
  readonly productCount: number;
}

export interface LookupFormModel {
  name: string;
  sortOrder: number | null;
}

export const lookupFormSchema = schema<LookupFormModel>((path) => {
  requiredText(path.name, 'Escribe el nombre');
  maxLength(path.name, 60, { message: 'Máximo 60 caracteres' });
  required(path.sortOrder, { message: 'Escribe la posición' });
  min(path.sortOrder, 0, { message: 'No puede ser negativa' });
  maxDecimals(path.sortOrder, 0);
});

export interface SizeFormModel {
  label: string;
  sortOrder: number | null;
  neckMin: number | null;
  neckMax: number | null;
  chestMin: number | null;
  chestMax: number | null;
  backLengthMin: number | null;
  backLengthMax: number | null;
}

type RangeKeys = readonly [keyof SizeFormModel, keyof SizeFormModel];

const RANGES: Readonly<Record<(typeof MEASUREMENTS)[number], RangeKeys>> = {
  neck: ['neckMin', 'neckMax'],
  chest: ['chestMin', 'chestMax'],
  backLength: ['backLengthMin', 'backLengthMax'],
};

export const sizeFormSchema = schema<SizeFormModel>((path) => {
  requiredText(path.label, 'Escribe la talla');
  maxLength(path.label, 10, { message: 'Máximo 10 caracteres' });
  required(path.sortOrder, { message: 'Escribe la posición' });
  min(path.sortOrder, 0, { message: 'No puede ser negativa' });
  maxDecimals(path.sortOrder, 0);

  for (const measurement of MEASUREMENTS) {
    const [minKey, maxKey] = RANGES[measurement];
    for (const key of [minKey, maxKey]) {
      const field = path[key] as typeof path.neckMin;
      required(field, { message: 'Escribe la medida' });
      min(field, 0.1, { message: 'Debe ser mayor a 0' });
      maxDecimals(field, 1);
    }
    validate(path[maxKey] as typeof path.neckMax, ({ valueOf }) => {
      const low = valueOf(path[minKey] as typeof path.neckMin);
      const high = valueOf(path[maxKey] as typeof path.neckMax);
      return low !== null && high !== null && low > high
        ? {
            kind: 'range',
            message: `El máximo de ${MEASUREMENT_LABELS[measurement]} no puede ser menor al mínimo`,
          }
        : undefined;
    });
  }
});

export function sizeFormFrom(size: Size | null, nextSortOrder: number): SizeFormModel {
  if (!size) {
    return {
      label: '',
      sortOrder: nextSortOrder,
      neckMin: null,
      neckMax: null,
      chestMin: null,
      chestMax: null,
      backLengthMin: null,
      backLengthMax: null,
    };
  }

  return {
    label: size.label,
    sortOrder: size.sortOrder,
    neckMin: size.neck.min,
    neckMax: size.neck.max,
    chestMin: size.chest.min,
    chestMax: size.chest.max,
    backLengthMin: size.backLength.min,
    backLengthMax: size.backLength.max,
  };
}

/**
 * @description "3 prendas usan esta categoría" before deactivating. It warns, it never blocks
 */
export function usageWarning(count: number, itemName: string): string {
  if (count === 0) {
    return `Ninguna prenda usa esta ${itemName}.`;
  }
  return count === 1
    ? `1 prenda usa esta ${itemName}. Seguirá a la venta con ella.`
    : `${count} prendas usan esta ${itemName}. Seguirán a la venta con ella.`;
}
