import { Service, inject } from '@angular/core';

import { Size, toSize } from '@core/catalog/size';
import { TablesInsert } from '@core/supabase/database.types';
import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap, unwrapNullable } from '@shared/data-access/supabase-result';
import { LookupFormModel, LookupTable, SizeFormModel } from '../models/catalog-lists';
import { slugify } from '../models/slugify';

export interface LookupRow {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly sortOrder: number;
  readonly active: boolean;
}

export interface SizeRow extends Size {
  readonly active: boolean;
}

/** How many published products use each category, pet type and size */
export interface Usage {
  readonly categories: ReadonlyMap<number, number>;
  readonly petTypes: ReadonlyMap<number, number>;
  readonly sizes: ReadonlyMap<number, number>;
}

/**
 * @description Categories, pet types and sizes. They are added, edited and deactivated, never deleted
 */
@Service()
export class CatalogListsRepository {
  private readonly supabase = inject(SUPABASE);

  async listLookup(table: LookupTable): Promise<LookupRow[]> {
    const rows = unwrap(
      await this.supabase
        .from(table)
        .select('id, name, slug, sort_order, active')
        .order('sort_order')
        .order('name'),
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sortOrder: row.sort_order,
      active: row.active,
    }));
  }

  async listSizes(): Promise<SizeRow[]> {
    const rows = unwrap(await this.supabase.from('sizes').select('*').order('sort_order'));
    return rows.map((row) => ({ ...toSize(row), active: row.active }));
  }

  async usage(): Promise<Usage> {
    const [products, variants] = await Promise.all([
      this.supabase.from('products').select('category_id, pet_type_id').eq('is_active', true),
      this.supabase
        .from('variants')
        .select('size_id, products!inner(is_active)')
        .eq('products.is_active', true),
    ]);
    const productRows = unwrap(products);

    return {
      categories: countBy(productRows.map((row) => row.category_id)),
      petTypes: countBy(productRows.map((row) => row.pet_type_id)),
      // A product has at most one variant per size, so variants count products
      sizes: countBy(unwrap(variants).map((row) => row.size_id)),
    };
  }

  async saveLookup(table: LookupTable, id: number | null, model: LookupFormModel): Promise<void> {
    const name = model.name.trim();
    const sortOrder = model.sortOrder ?? 0;

    if (id === null) {
      unwrapNullable(
        await this.supabase
          .from(table)
          .insert({ name, slug: slugify(name), sort_order: sortOrder }),
      );
    } else {
      unwrapNullable(
        await this.supabase.from(table).update({ name, sort_order: sortOrder }).eq('id', id),
      );
    }
  }

  async setLookupActive(table: LookupTable, id: number, active: boolean): Promise<void> {
    unwrapNullable(await this.supabase.from(table).update({ active }).eq('id', id));
  }

  async saveSize(id: number | null, model: SizeFormModel): Promise<void> {
    const columns = toSizeColumns(model);

    if (id === null) {
      unwrapNullable(await this.supabase.from('sizes').insert(columns));
    } else {
      unwrapNullable(await this.supabase.from('sizes').update(columns).eq('id', id));
    }
  }

  async setSizeActive(id: number, active: boolean): Promise<void> {
    unwrapNullable(await this.supabase.from('sizes').update({ active }).eq('id', id));
  }
}

function toSizeColumns(model: SizeFormModel): TablesInsert<'sizes'> {
  return {
    label: model.label.trim(),
    sort_order: model.sortOrder ?? 0,
    neck_min: model.neckMin ?? 0,
    neck_max: model.neckMax ?? 0,
    chest_min: model.chestMin ?? 0,
    chest_max: model.chestMax ?? 0,
    back_length_min: model.backLengthMin ?? 0,
    back_length_max: model.backLengthMax ?? 0,
  };
}

function countBy(ids: readonly number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
