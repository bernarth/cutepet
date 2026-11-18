const BOLIVIA_CODE = '591';

/**
 * @description wa.me needs the country code, so an 8 digit Bolivian number gets 591
 */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const number = digits.length === 8 ? `${BOLIVIA_CODE}${digits}` : digits;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
