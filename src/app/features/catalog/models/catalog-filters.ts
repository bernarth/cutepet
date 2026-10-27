import { Database } from '@core/supabase/database.types';

export type Availability = Database['public']['Enums']['availability'];

export interface CatalogFilters {
  readonly petType: string | null;
  readonly category: string | null;
  readonly size: string | null;
  readonly availability: Availability | null;
}

export type CatalogFilterKey = keyof CatalogFilters;

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterGroup {
  readonly key: CatalogFilterKey;
  readonly label: string;
  readonly options: readonly FilterOption[];
}

/** Query param names are Spanish because they are part of the URL the customer shares */
export const FILTER_PARAMS: Readonly<Record<CatalogFilterKey, string>> = {
  petType: 'mascota',
  category: 'categoria',
  size: 'talla',
  availability: 'disponibilidad',
};

const AVAILABILITY_PARAMS: Readonly<Record<Availability, string>> = {
  in_stock: 'en-stock',
  made_to_order: 'a-pedido',
};

export const AVAILABILITY_OPTIONS: readonly FilterOption[] = [
  { value: AVAILABILITY_PARAMS.in_stock, label: 'Lista para llevar' },
  { value: AVAILABILITY_PARAMS.made_to_order, label: 'Hecha a pedido' },
];

export const NO_FILTERS: CatalogFilters = {
  petType: null,
  category: null,
  size: null,
  availability: null,
};

export function filtersFromParams(params: Readonly<Record<string, unknown>>): CatalogFilters {
  const read = (key: CatalogFilterKey) => {
    const value = params[FILTER_PARAMS[key]];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  };
  const availabilityParam = read('availability');
  const availability =
    (Object.keys(AVAILABILITY_PARAMS) as Availability[]).find(
      (key) => AVAILABILITY_PARAMS[key] === availabilityParam,
    ) ?? null;

  return { petType: read('petType'), category: read('category'), size: read('size'), availability };
}

/** Values as they appear in the URL. null removes the param */
export function filterParamValues(
  filters: CatalogFilters,
): Record<CatalogFilterKey, string | null> {
  return {
    petType: filters.petType,
    category: filters.category,
    size: filters.size,
    availability: filters.availability ? AVAILABILITY_PARAMS[filters.availability] : null,
  };
}
