import { WhatsappOrder, whatsappOrderMessage, whatsappOrderUrl } from './whatsapp-order';

const coat = {
  productName: 'Abrigo Osito Rosa',
  sizeLabel: '1 (A)',
  measurements: { neck: 28, chest: 42, backLength: 32 },
  unitPrice: 120,
  quantity: 1,
  productUrl: 'https://cutepet.test/catalogo/abrigo-osito-rosa',
};

const dress = {
  productName: 'Vestido Floral',
  sizeLabel: '0',
  measurements: { neck: null, chest: 38.5, backLength: null },
  unitPrice: 95,
  quantity: 2,
  productUrl: 'https://cutepet.test/catalogo/vestido-floral',
};

function order(overrides: Partial<WhatsappOrder>): WhatsappOrder {
  return {
    items: [coat],
    total: 120,
    units: 1,
    delivery: 'pickup_point',
    pickupFee: 2,
    ...overrides,
  };
}

describe('whatsappOrderMessage', () => {
  it('writes the whole order for pickup with a fee', () => {
    expect(whatsappOrderMessage(order({}))).toBe(
      [
        '¡Hola CutePet! Quiero hacer este pedido desde la web:',
        '',
        '• Abrigo Osito Rosa · Talla 1 (A) · cuello 28, pecho 42, largo 32 cm · Bs 120 · https://cutepet.test/catalogo/abrigo-osito-rosa',
        '',
        'Total: Bs 120 (1 prenda)',
        'Entrega: recojo en La Paz (Bs 2 al recoger)',
        '',
        '¿Me confirmas para hacer el pago?',
      ].join('\n'),
    );
  });

  it('shows the quantity, line subtotal and only the measurements present', () => {
    const message = whatsappOrderMessage(order({ items: [dress], total: 190, units: 2 }));
    expect(message).toContain(
      '• 2 x Vestido Floral · Talla 0 · pecho 38,5 cm · Bs 190 · https://cutepet.test/catalogo/vestido-floral',
    );
    expect(message).toContain('Total: Bs 190 (2 prendas)');
  });

  it('omits measurements when the piece has none', () => {
    const plain = { ...coat, measurements: { neck: null, chest: null, backLength: null } };
    expect(whatsappOrderMessage(order({ items: [plain] }))).toContain(
      '• Abrigo Osito Rosa · Talla 1 (A) · Bs 120 · https://',
    );
  });

  it('describes free pickup and bus parcel shipping', () => {
    expect(whatsappOrderMessage(order({ pickupFee: 0 }))).toContain(
      'Entrega: recojo en La Paz (gratis)',
    );
    expect(whatsappOrderMessage(order({ delivery: 'bus_parcel' }))).toContain(
      'Entrega: envío por flota a otro departamento (el envío lo pago en la terminal)',
    );
  });
});

describe('whatsappOrderUrl', () => {
  it('adds the Bolivian code to an 8 digit number', () => {
    expect(whatsappOrderUrl('71234567', 'Hola')).toBe('https://wa.me/59171234567?text=Hola');
  });

  it('keeps a number that already has its country code', () => {
    expect(whatsappOrderUrl('+591 71234567', 'Hola')).toBe('https://wa.me/59171234567?text=Hola');
  });

  it('encodes new lines, accents and characters that would cut the link', () => {
    const url = whatsappOrderUrl('59171234567', '¡Año & #1\n• ok?');
    expect(url).toBe(
      'https://wa.me/59171234567?text=%C2%A1A%C3%B1o%20%26%20%231%0A%E2%80%A2%20ok%3F',
    );
    expect(decodeURIComponent(url.split('text=')[1])).toBe('¡Año & #1\n• ok?');
  });
});
