import { SchemaPath, apply, max, min, required, schema } from '@angular/forms/signals';

import { Measurements } from '@core/catalog/size';
import { AdminVariant } from './admin-product';
import { maxDecimals } from '@shared/forms/form-rules';

export interface VariantFormModel {
  sizeId: number | null;
  neckCm: number | null;
  chestCm: number | null;
  backLengthCm: number | null;
  toleranceCm: number | null;
  stock: number | null;
}

function centimeterRules(path: SchemaPath<number | null>, maxCm: number): void {
  min(path, 0.1, { message: 'Debe ser mayor a 0' });
  max(path, maxCm, { message: `Máximo ${maxCm} cm` });
  maxDecimals(path, 1);
}

export const variantFormSchema = schema<VariantFormModel>((path) => {
  required(path.sizeId, { message: 'Elige la talla' });
  centimeterRules(path.neckCm, 999.9);
  centimeterRules(path.chestCm, 999.9);
  centimeterRules(path.backLengthCm, 999.9);
  centimeterRules(path.toleranceCm, 99.9);
});

/**
 * @description A new size also asks for its initial stock. Later changes go through a stock adjustment
 */
export const newVariantFormSchema = schema<VariantFormModel>((path) => {
  apply(path, variantFormSchema);
  required(path.stock, { message: 'Escribe cuántas prendas hay' });
  min(path.stock, 0, { message: 'No puede ser negativo' });
  maxDecimals(path.stock, 0);
});

const NEW_VARIANT_FORM: VariantFormModel = {
  sizeId: null,
  neckCm: null,
  chestCm: null,
  backLengthCm: null,
  toleranceCm: null,
  stock: 1,
};

export function variantFormFrom(variant: AdminVariant | null): VariantFormModel {
  if (!variant) {
    return { ...NEW_VARIANT_FORM };
  }

  return {
    sizeId: variant.sizeId,
    neckCm: variant.neckCm,
    chestCm: variant.chestCm,
    backLengthCm: variant.backLengthCm,
    toleranceCm: variant.toleranceCm,
    stock: variant.stock,
  };
}

export function variantMeasurements(
  model: Pick<VariantFormModel, 'neckCm' | 'chestCm' | 'backLengthCm'>,
): Measurements {
  return {
    ...(model.neckCm !== null && { neck: model.neckCm }),
    ...(model.chestCm !== null && { chest: model.chestCm }),
    ...(model.backLengthCm !== null && { backLength: model.backLengthCm }),
  };
}
