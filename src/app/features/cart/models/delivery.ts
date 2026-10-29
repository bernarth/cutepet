import { Database } from '@core/supabase/database.types';
import { PickupRule } from '@core/cart/cart-summary';
import { formatPrice } from '@shared/pipes/price';

export type DeliveryMethod = Database['public']['Enums']['delivery_method'];

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
