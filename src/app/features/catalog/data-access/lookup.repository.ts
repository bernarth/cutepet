import { Service, inject } from '@angular/core';

import { SUPABASE } from '@core/supabase/supabase.client';
import { AppError, unwrap } from '@shared/data-access/supabase-result';
import { FilterOption } from '../models/catalog-filters';
import { toSize } from '../models/product.mapper';
import { Size } from '../models/size';

/** Lookup tables the admin edits: pet types, categories, sizes and the size tolerance setting */
@Service()
export class LookupRepository {
  private readonly supabase = inject(SUPABASE);

  async listPetTypes(): Promise<FilterOption[]> {
    const rows = unwrap(
      await this.supabase
        .from('pet_types')
        .select('slug, name')
        .eq('active', true)
        .order('sort_order'),
    );
    return rows.map((row) => ({ value: row.slug, label: row.name }));
  }

  /** Only active categories with at least one product shown in the catalog */
  async listCatalogCategories(): Promise<FilterOption[]> {
    const rows = unwrap(
      await this.supabase
        .from('categories')
        .select('slug, name, catalog_products!inner()')
        .eq('active', true)
        .neq('catalog_products.catalog_status', 'sold_out')
        .order('sort_order'),
    );
    return rows.map((row) => ({ value: row.slug, label: row.name }));
  }

  async listActiveSizes(): Promise<Size[]> {
    const rows = unwrap(
      await this.supabase.from('sizes').select('*').eq('active', true).order('sort_order'),
    );
    return rows.map(toSize);
  }

  async getSizeToleranceCm(): Promise<number> {
    const [settings] = unwrap(
      await this.supabase.from('settings').select('size_tolerance_cm').limit(1),
    );
    if (!settings) {
      throw new AppError('Faltan los ajustes de la tienda', 'NOT_FOUND');
    }
    return settings.size_tolerance_cm;
  }
}
