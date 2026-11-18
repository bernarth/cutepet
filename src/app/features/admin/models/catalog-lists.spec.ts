import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import { SizeFormModel, lookupFormSchema, sizeFormSchema, usageWarning } from './catalog-lists';

const size: SizeFormModel = {
  label: '8',
  sortOrder: 11,
  neckMin: 55,
  neckMax: 59,
  chestMin: 84,
  chestMax: 90,
  backLengthMin: 65,
  backLengthMax: 69,
};

function sizeForm(model: SizeFormModel) {
  return TestBed.runInInjectionContext(() => form(signal(model), sizeFormSchema));
}

describe('size form', () => {
  it('accepts a complete size', () => {
    expect(sizeForm(size)().valid()).toBe(true);
  });

  it('keeps each minimum at most its maximum', () => {
    const errors = sizeForm({ ...size, chestMin: 91 })
      .chestMax()
      .errors();

    expect(errors.map((error) => error.message)).toEqual([
      'El máximo de pecho no puede ser menor al mínimo',
    ]);
    expect(sizeForm({ ...size, neckMin: 59 })().valid()).toBe(true);
  });

  it('needs every range and a label', () => {
    const missing = sizeForm({ ...size, label: ' ', backLengthMax: null });

    expect(missing.label().errors()[0]?.message).toBe('Escribe la talla');
    expect(missing.backLengthMax().errors()[0]?.message).toBe('Escribe la medida');
  });
});

describe('lookup form', () => {
  it('needs a name and a whole position', () => {
    const lookup = TestBed.runInInjectionContext(() =>
      form(signal({ name: '', sortOrder: 1.5 }), lookupFormSchema),
    );

    expect(lookup.name().errors()[0]?.message).toBe('Escribe el nombre');
    expect(lookup.sortOrder().errors()[0]?.message).toBe('Usa un número entero');
  });
});

describe('usageWarning', () => {
  it('says how many products use the item, without blocking', () => {
    expect(usageWarning(3, 'categoría')).toBe(
      '3 prendas usan esta categoría. Seguirán a la venta con ella.',
    );
    expect(usageWarning(1, 'talla')).toBe('1 prenda usa esta talla. Seguirá a la venta con ella.');
    expect(usageWarning(0, 'categoría')).toBe('Ninguna prenda usa esta categoría.');
  });
});
