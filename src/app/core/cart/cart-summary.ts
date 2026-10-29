import { countUnits } from './cart-line';

export interface PricedLine {
  readonly unitPrice: number;
  readonly quantity: number;
}

export interface PickupRule {
  readonly fee: number;
  readonly freeFromUnits: number;
}

export function itemsTotal(lines: readonly PricedLine[]): number {
  const cents = lines.reduce(
    (total, line) => total + Math.round(line.unitPrice * 100) * line.quantity,
    0,
  );

  return cents / 100;
}

/**
 * @description Paid at the pickup point, never added to the total. Free from N units
 */
export function pickupFee(lines: readonly PricedLine[], rule: PickupRule): number {
  return countUnits(lines) >= rule.freeFromUnits ? 0 : rule.fee;
}
