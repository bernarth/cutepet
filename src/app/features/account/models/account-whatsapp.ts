/** The customer completes the code in the chat */
export const OTHER_DEVICE_MESSAGE =
  '¡Hola CutePet! Hice un pedido desde otro celular y quiero saber cómo va. Mi código de pedido es: ';

export function lostOrdersMessage(orderCodes: readonly string[]): string {
  return orderCodes.length > 0
    ? `¡Hola CutePet! No veo en mi cuenta los pedidos que hice como invitado: ${orderCodes.join(', ')}. ¿Me ayudan?`
    : '¡Hola CutePet! No veo en mi cuenta los pedidos que hice como invitado. ¿Me ayudan?';
}
