import { maxLength, min, required, schema, validate } from '@angular/forms/signals';

import { AdminVariant, heldUnits } from './admin-product';
import { maxDecimals, requiredText } from '@shared/forms/form-rules';

export interface StockAdjustmentModel {
  newStock: number | null;
  reason: string;
}

export const REASON_MAX_LENGTH = 300;

export const STOCK_ADJUSTMENT_REASONS: readonly string[] = [
  'Prenda dañada',
  'Error de registro',
  'Conteo físico',
];

export function stockAdjustmentSchema(variant: AdminVariant) {
  const held = heldUnits(variant);

  return schema<StockAdjustmentModel>((path) => {
    required(path.newStock, { message: 'Escribe el nuevo stock' });
    min(path.newStock, held, {
      message:
        held > 0 ? `Hay ${held} en pedidos: el stock no puede ser menor` : 'No puede ser negativo',
    });
    maxDecimals(path.newStock, 0);
    validate(path.newStock, ({ value }) =>
      value() === variant.stock
        ? { kind: 'unchanged', message: 'Es el mismo stock de ahora' }
        : undefined,
    );
    requiredText(path.reason, 'Escribe el motivo');
    maxLength(path.reason, REASON_MAX_LENGTH, {
      message: `Máximo ${REASON_MAX_LENGTH} caracteres`,
    });
  });
}
