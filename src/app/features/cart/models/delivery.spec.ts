import { busParcelPayerText, hasDeliveryCost, pickupRuleText, unitsText } from './delivery';

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

describe('hasDeliveryCost', () => {
  it('is true only when pickup has a fee', () => {
    expect(hasDeliveryCost('pickup_point', 2, false)).toBe(true);
    expect(hasDeliveryCost('pickup_point', 0, false)).toBe(false);
  });

  it('is true only when the customer pays the bus parcel', () => {
    expect(hasDeliveryCost('bus_parcel', 0, false)).toBe(true);
    expect(hasDeliveryCost('bus_parcel', 2, true)).toBe(false);
  });
});

describe('busParcelPayerText', () => {
  it('says who pays the bus parcel', () => {
    expect(busParcelPayerText(true)).toBe('lo paga CutePet');
    expect(busParcelPayerText(false)).toBe('lo pagas en la terminal');
  });
});
