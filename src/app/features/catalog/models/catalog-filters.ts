export interface CatalogFilters {
  readonly petType: string | null;
  readonly category: string | null;
  readonly size: string | null;
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

export interface ActiveFilter {
  readonly key: CatalogFilterKey;
  readonly label: string;
}

/** Query param names are Spanish because they are part of the URL the customer shares */
export const FILTER_PARAMS: Readonly<Record<CatalogFilterKey, string>> = {
  petType: 'mascota',
  category: 'categoria',
  size: 'talla',
};

export function filtersFromParams(params: Readonly<Record<string, unknown>>): CatalogFilters {
  const read = (key: CatalogFilterKey) => {
    const value = params[FILTER_PARAMS[key]];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  };
  return { petType: read('petType'), category: read('category'), size: read('size') };
}

/** One entry per selected filter, labelled with the option name, for the removable chips */
export function activeFilters(
  groups: readonly FilterGroup[],
  filters: CatalogFilters,
): ActiveFilter[] {
  return groups.flatMap((group) => {
    const option = group.options.find((item) => item.value === filters[group.key]);
    return option ? [{ key: group.key, label: `${group.label}: ${option.label}` }] : [];
  });
}
