import { max, maxLength, min, pattern, required, schema } from '@angular/forms/signals';

import { AdminProduct } from './admin-product';
import { maxDecimals, requiredText } from '@shared/forms/form-rules';
import { SLUG_PATTERN } from './slugify';

export interface ProductFormModel {
  name: string;
  description: string;
  petTypeId: number | null;
  categoryId: number | null;
  price: number | null;
}

export const NAME_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 2000;

export const EMPTY_PRODUCT_FORM: ProductFormModel = {
  name: '',
  description: '',
  petTypeId: null,
  categoryId: null,
  price: null,
};

export const productFormSchema = schema<ProductFormModel>((path) => {
  requiredText(path.name, 'Escribe el nombre de la prenda');
  maxLength(path.name, NAME_MAX_LENGTH, { message: `Máximo ${NAME_MAX_LENGTH} caracteres` });
  maxLength(path.description, DESCRIPTION_MAX_LENGTH, {
    message: `Máximo ${DESCRIPTION_MAX_LENGTH} caracteres`,
  });
  required(path.petTypeId, { message: 'Elige la mascota' });
  required(path.categoryId, { message: 'Elige la categoría' });
  required(path.price, { message: 'Escribe el precio' });
  min(path.price, 0.01, { message: 'El precio debe ser mayor a 0' });
  max(path.price, 99999.99, { message: 'El precio es demasiado alto' });
  maxDecimals(path.price, 2);
});

export interface SlugFormModel {
  slug: string;
}

export const slugFormSchema = schema<SlugFormModel>((path) => {
  requiredText(path.slug, 'Escribe el enlace');
  pattern(path.slug, SLUG_PATTERN, {
    message: 'Usa solo minúsculas sin tildes, números y guiones. Ejemplo: abrigo-osito-rosa',
  });
});

export function productFormFrom(product: AdminProduct): ProductFormModel {
  return {
    name: product.name,
    description: product.description,
    petTypeId: product.petTypeId,
    categoryId: product.categoryId,
    price: product.price,
  };
}

export interface ProductInput {
  readonly name: string;
  readonly description: string;
  readonly petTypeId: number;
  readonly categoryId: number;
  readonly price: number;
}

/**
 * @description Only called after the form passed validation, so the required values are present
 */
export function toProductInput(model: ProductFormModel): ProductInput {
  const { petTypeId, categoryId, price } = model;

  if (petTypeId === null || categoryId === null || price === null) {
    throw new Error('El formulario de la prenda está incompleto');
  }

  return {
    name: model.name.trim(),
    description: model.description.trim(),
    petTypeId,
    categoryId,
    price,
  };
}
