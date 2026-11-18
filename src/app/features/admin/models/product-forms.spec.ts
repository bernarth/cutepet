import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldTree, Schema, form } from '@angular/forms/signals';

import { AdminVariant } from './admin-product';
import {
  EMPTY_PRODUCT_FORM,
  ProductFormModel,
  productFormSchema,
  slugFormSchema,
} from './product-form';
import { stockAdjustmentSchema } from './stock-adjustment-form';
import { newVariantFormSchema, variantFormFrom, variantFormSchema } from './variant-form';

function formFor<T>(model: T, schema: Schema<T>): FieldTree<T> {
  return TestBed.runInInjectionContext(() => form(signal(model), schema));
}

function messages(field: FieldTree<unknown>): string[] {
  return field()
    .errors()
    .map((error) => error.message ?? error.kind);
}

const validProduct: ProductFormModel = {
  name: 'Abrigo Osito',
  description: '',
  petTypeId: 1,
  categoryId: 2,
  price: 120,
};

const variant: AdminVariant = {
  id: 7,
  sizeId: 4,
  sizeLabel: '1',
  sizeSortOrder: 4,
  neckCm: null,
  chestCm: null,
  backLengthCm: null,
  toleranceCm: null,
  stock: 3,
  availableStock: 1,
  hasOrders: false,
};

describe('product form', () => {
  it('accepts a complete product', () => {
    expect(formFor(validProduct, productFormSchema)().valid()).toBe(true);
  });

  it('asks for every required value and rejects a name made of spaces', () => {
    const product = formFor({ ...EMPTY_PRODUCT_FORM, name: '   ' }, productFormSchema);

    expect(messages(product.name)).toEqual(['Escribe el nombre de la prenda']);
    expect(messages(product.petTypeId)).toEqual(['Elige la mascota']);
    expect(messages(product.price)).toEqual(['Escribe el precio']);
  });

  it('rejects a price of 0 or with more than 2 decimals', () => {
    expect(messages(formFor({ ...validProduct, price: 0 }, productFormSchema).price)).toEqual([
      'El precio debe ser mayor a 0',
    ]);
    expect(messages(formFor({ ...validProduct, price: 10.555 }, productFormSchema).price)).toEqual([
      'Usa como máximo 2 decimales',
    ]);
  });

  it('accepts only lowercase links with dashes', () => {
    expect(formFor({ slug: 'abrigo-osito-2' }, slugFormSchema)().valid()).toBe(true);
    expect(formFor({ slug: 'Abrigo osito' }, slugFormSchema)().valid()).toBe(false);
  });
});

describe('variant form', () => {
  it('asks for the initial stock only when the size is new', () => {
    const newSize = { ...variantFormFrom(null), sizeId: 4, stock: null };

    expect(messages(formFor(newSize, newVariantFormSchema).stock)).toEqual([
      'Escribe cuántas prendas hay',
    ]);
    expect(formFor(newSize, variantFormSchema)().valid()).toBe(true);
  });

  it('allows empty measurements but not zero or two decimals', () => {
    const model = { ...variantFormFrom(variant), neckCm: 0, chestCm: 42.25 };
    const sizeForm = formFor(model, variantFormSchema);

    expect(messages(sizeForm.neckCm)).toEqual(['Debe ser mayor a 0']);
    expect(messages(sizeForm.chestCm)).toEqual(['Usa como máximo 1 decimal']);
    expect(messages(sizeForm.backLengthCm)).toEqual([]);
  });
});

describe('stock adjustment form', () => {
  const schema = stockAdjustmentSchema(variant);

  it('never goes below the units held by orders', () => {
    expect(messages(formFor({ newStock: 1, reason: 'Prenda dañada' }, schema).newStock)).toEqual([
      'Hay 2 en pedidos: el stock no puede ser menor',
    ]);
  });

  it('needs a real change and a reason', () => {
    const adjustment = formFor({ newStock: 3, reason: '  ' }, schema);

    expect(messages(adjustment.newStock)).toEqual(['Es el mismo stock de ahora']);
    expect(messages(adjustment.reason)).toEqual(['Escribe el motivo']);
  });
});
