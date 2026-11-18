import { whatsappLink } from './whatsapp-link';

describe('whatsappLink', () => {
  it('adds the Bolivian code to an 8 digit number', () => {
    expect(whatsappLink('71234567', 'Hola')).toBe('https://wa.me/59171234567?text=Hola');
  });

  it('keeps a number that already has its country code', () => {
    expect(whatsappLink('+591 71234567', 'Hola')).toBe('https://wa.me/59171234567?text=Hola');
  });

  it('encodes new lines, accents and characters that would cut the link', () => {
    const url = whatsappLink('59171234567', '¡Año & #1\n• ok?');
    expect(url).toBe(
      'https://wa.me/59171234567?text=%C2%A1A%C3%B1o%20%26%20%231%0A%E2%80%A2%20ok%3F',
    );
    expect(decodeURIComponent(url.split('text=')[1])).toBe('¡Año & #1\n• ok?');
  });
});
