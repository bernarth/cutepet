import { pickupRuleText, unitsText } from './delivery';

const rule = { fee: 2, freeFromUnits: 3 };

describe('pickupRuleText', () => {
  it('shows the fee and the free threshold', () => {
    expect(pickupRuleText(rule, 2)).toBe('Recojo en La Paz: Bs 2, gratis desde 3 prendas');
  });

  it('says it is free once the cart reaches the threshold', () => {
    expect(pickupRuleText(rule, 0)).toBe('Recojo en La Paz: gratis');
  });
});

describe('unitsText', () => {
  it('uses singular for one piece', () => {
    expect(unitsText(1)).toBe('1 prenda');
    expect(unitsText(3)).toBe('3 prendas');
  });
});
