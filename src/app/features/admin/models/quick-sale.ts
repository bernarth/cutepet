import { apply, minLength, schema } from '@angular/forms/signals';

import {
  CustomerDetails,
  CustomerDetailsRequest,
  EMPTY_CUSTOMER_DETAILS,
  customerDetailsSchema,
  toCustomerDetailsRequest,
} from '@core/orders/customer-details';

/**
 * @description One size that can be sold right now
 */
export interface SaleOption {
  readonly variantId: number;
  readonly productName: string;
  readonly sizeLabel: string;
  readonly unitPrice: number;
  readonly available: number;
}

export interface SaleProduct {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly photoUrl: string | null;
  readonly options: readonly SaleOption[];
}

/**
 * @description Name, size and price are kept to show the line even if the item stops being available
 */
export interface SaleLine {
  readonly variantId: number;
  readonly quantity: number;
  readonly productName: string;
  readonly sizeLabel: string;
  readonly unitPrice: number;
}

export interface QuickSaleModel extends CustomerDetails {
  lines: SaleLine[];
}

export const EMPTY_QUICK_SALE: QuickSaleModel = { ...EMPTY_CUSTOMER_DETAILS, lines: [] };

export const quickSaleSchema = schema<QuickSaleModel>((path) => {
  minLength(path.lines, 1, { message: 'Agrega al menos una prenda' });
  apply(path, customerDetailsSchema);
});

/**
 * @description Adds one unit of a size, never more than what is available
 */
export function addLine(lines: readonly SaleLine[], option: SaleOption): SaleLine[] {
  const current = lines.find((line) => line.variantId === option.variantId);

  if (!current) {
    if (option.available === 0) {
      return [...lines];
    }
    const { variantId, productName, sizeLabel, unitPrice } = option;
    return [...lines, { variantId, productName, sizeLabel, unitPrice, quantity: 1 }];
  }

  return lines.map((line) =>
    line === current ? { ...line, quantity: Math.min(line.quantity + 1, option.available) } : line,
  );
}

/**
 * @description A line that can no longer be sold as it is: the size is gone or has fewer units now
 */
export function isLineAvailable(line: SaleLine, options: ReadonlyMap<number, SaleOption>): boolean {
  const option = options.get(line.variantId);
  return option !== undefined && line.quantity <= option.available;
}

export function removeLine(lines: readonly SaleLine[], variantId: number): SaleLine[] {
  return lines.filter((line) => line.variantId !== variantId);
}

export interface QuickSaleRequest extends CustomerDetailsRequest {
  readonly items: { variant_id: number; quantity: number }[];
}

export function toQuickSaleRequest(model: QuickSaleModel): QuickSaleRequest {
  return {
    items: model.lines.map((line) => ({ variant_id: line.variantId, quantity: line.quantity })),
    ...toCustomerDetailsRequest(model),
  };
}
