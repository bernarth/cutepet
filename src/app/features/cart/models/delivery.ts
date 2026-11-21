import { PickupRule } from '@core/cart/cart-summary';
import { DeliveryMethod } from '@core/orders/customer-details';
import { formatPrice } from '@shared/pipes/price';

export function unitsText(units: number): string {
  return `${units} ${units === 1 ? 'prenda' : 'prendas'}`;
}

/**
 * @description "Recojo en La Paz: Bs 2, gratis desde 3 prendas" or "Recojo en La Paz: gratis"
 */
export function pickupRuleText(rule: PickupRule, fee: number): string {
  return fee === 0
    ? 'Recojo en La Paz: gratis'
    : `Recojo en La Paz: ${formatPrice(rule.fee)}, gratis desde ${unitsText(rule.freeFromUnits)}`;
}

/**
 * @description Same wording in the cart summary and the QR checkout form
 */
export function busParcelPayerText(paidByStore: boolean): string {
  return paidByStore ? 'lo paga CutePet' : 'lo pagas en la terminal';
}

/**
 * @description The total never includes delivery, so the note matters only when the customer pays something
 */
export function hasDeliveryCost(
  delivery: DeliveryMethod,
  pickupFee: number,
  shippingPaidByStore: boolean,
): boolean {
  return delivery === 'pickup_point' ? pickupFee > 0 : !shippingPaidByStore;
}
