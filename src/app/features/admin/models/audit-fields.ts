import { ORDER_STATUS_LABELS, OrderStatus } from '@core/orders/order-status';
import { formatCm } from '@shared/pipes/centimeters';
import { formatPrice } from '@shared/pipes/price';
import { DELIVERY_LABELS, DeliveryMethod } from '@core/orders/customer-details';

/** Names of sizes, categories and pet types, so ids read as words */
export interface AuditLookups {
  readonly sizes: ReadonlyMap<number, string>;
  readonly categories: ReadonlyMap<number, string>;
  readonly petTypes: ReadonlyMap<number, string>;
}

type FieldFormat =
  | 'text'
  | 'long'
  | 'number'
  | 'price'
  | 'cm'
  | 'yesNo'
  | 'status'
  | 'delivery'
  | 'file'
  | 'size'
  | 'category'
  | 'petType';

interface FieldInfo {
  readonly label: string;
  readonly format: FieldFormat;
}

/**
 * @description Columns shown in the audit log, in Spanish. Technical columns (ids, paths, reservation times) are left out
 */
const FIELDS: Readonly<Record<string, FieldInfo>> = {
  status: { label: 'Estado', format: 'status' },
  needs_attention: { label: 'Necesita revisión', format: 'yesNo' },
  customer_name: { label: 'Cliente', format: 'text' },
  customer_phone: { label: 'Celular', format: 'text' },
  delivery_method: { label: 'Entrega', format: 'delivery' },
  destination_city: { label: 'Ciudad de destino', format: 'text' },
  recipient_name: { label: 'Recibe', format: 'text' },
  items_total: { label: 'Total', format: 'price' },
  payment_proof_path: { label: 'Comprobante', format: 'file' },
  shipping_receipt_path: { label: 'Guía de envío', format: 'file' },
  product_name: { label: 'Prenda', format: 'text' },
  quantity: { label: 'Cantidad', format: 'number' },
  unit_price: { label: 'Precio', format: 'price' },
  name: { label: 'Nombre', format: 'text' },
  slug: { label: 'Enlace', format: 'text' },
  description: { label: 'Descripción', format: 'long' },
  price: { label: 'Precio', format: 'price' },
  is_active: { label: 'Publicada', format: 'yesNo' },
  is_featured: { label: 'Destacada', format: 'yesNo' },
  pet_type_id: { label: 'Mascota', format: 'petType' },
  category_id: { label: 'Categoría', format: 'category' },
  size_id: { label: 'Talla', format: 'size' },
  stock: { label: 'Stock', format: 'number' },
  neck_cm: { label: 'Cuello', format: 'cm' },
  chest_cm: { label: 'Pecho', format: 'cm' },
  back_length_cm: { label: 'Largo', format: 'cm' },
  tolerance_cm: { label: 'Tolerancia', format: 'cm' },
  alt_text: { label: 'Descripción de la foto', format: 'text' },
  sort_order: { label: 'Posición', format: 'number' },
  label: { label: 'Talla', format: 'text' },
  active: { label: 'Activa', format: 'yesNo' },
  neck_min: { label: 'Cuello mínimo', format: 'cm' },
  neck_max: { label: 'Cuello máximo', format: 'cm' },
  chest_min: { label: 'Pecho mínimo', format: 'cm' },
  chest_max: { label: 'Pecho máximo', format: 'cm' },
  back_length_min: { label: 'Largo mínimo', format: 'cm' },
  back_length_max: { label: 'Largo máximo', format: 'cm' },
  role: { label: 'Rol', format: 'text' },
  qr_checkout_enabled: { label: 'Pago con QR activo', format: 'yesNo' },
  qr_disabled_message: { label: 'Mensaje con QR apagado', format: 'text' },
  qr_image_path: { label: 'Imagen del QR', format: 'file' },
  qr_expires_on: { label: 'QR vale hasta', format: 'text' },
  reservation_minutes: { label: 'Minutos para pagar', format: 'number' },
  validation_hours: { label: 'Horario de validación', format: 'text' },
  store_whatsapp: { label: 'WhatsApp de la tienda', format: 'text' },
  pickup_address: { label: 'Dirección de recojo', format: 'text' },
  pickup_hours: { label: 'Horario de recojo', format: 'text' },
  pickup_notice: { label: 'Aviso de recojo', format: 'text' },
  pickup_fee: { label: 'Costo del recojo', format: 'price' },
  free_pickup_min_items: { label: 'Recojo gratis desde (prendas)', format: 'number' },
  shipping_promo_enabled: { label: 'Promoción de envío', format: 'yesNo' },
  shipping_promo_min_items: { label: 'Promoción desde (prendas)', format: 'number' },
  shipping_promo_min_total: { label: 'Promoción desde (total)', format: 'price' },
  size_tolerance_cm: { label: 'Tolerancia general', format: 'cm' },
};

const TEXT_LIMIT = 60;

export interface AuditChange {
  readonly label: string;
  /** null for a value that did not exist before (creation) */
  readonly before: string | null;
  readonly after: string;
}

/**
 * @description Readable changes between two versions of a row. A creation lists the values it started with
 */
export function auditChanges(
  before: Readonly<Record<string, unknown>> | null,
  after: Readonly<Record<string, unknown>> | null,
  lookups: AuditLookups,
): AuditChange[] {
  const current = after ?? {};

  return Object.entries(FIELDS).flatMap(([field, info]) => {
    if (!(field in current) || (before && before[field] === current[field])) {
      return [];
    }
    if (!before && isEmpty(current[field])) {
      return [];
    }
    if (info.format === 'long') {
      return [{ label: info.label, before: null, after: before ? 'actualizada' : 'agregada' }];
    }
    return [
      {
        label: info.label,
        before: before ? formatValue(before[field], info.format, lookups) : null,
        after: formatValue(current[field], info.format, lookups),
      },
    ];
  });
}

type Formatter = (value: unknown, lookups: AuditLookups) => string;

const FORMATTERS: Readonly<Record<FieldFormat, Formatter>> = {
  text: (value) => shorten(String(value)),
  long: () => 'actualizada',
  number: (value) => String(value),
  price: (value) => formatPrice(Number(value)),
  cm: (value) => formatCm(Number(value)),
  yesNo: (value) => (value ? 'sí' : 'no'),
  status: (value) => ORDER_STATUS_LABELS[value as OrderStatus] ?? String(value),
  delivery: (value) => DELIVERY_LABELS[value as DeliveryMethod] ?? String(value),
  file: (value) => (isEmpty(value) ? 'sin archivo' : 'adjuntado'),
  size: (value, lookups) => `Talla ${lookups.sizes.get(Number(value)) ?? '?'}`,
  category: (value, lookups) => lookups.categories.get(Number(value)) ?? 'Categoría sin nombre',
  petType: (value, lookups) => lookups.petTypes.get(Number(value)) ?? 'Mascota sin nombre',
};

/**
 * @description Yes or no and file fields have their own wording for an empty value; any other empty value reads "vacío"
 */
export function formatValue(value: unknown, format: FieldFormat, lookups: AuditLookups): string {
  if (isEmpty(value) && format !== 'file' && format !== 'yesNo') {
    return 'vacío';
  }
  return FORMATTERS[format](value, lookups);
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function shorten(text: string): string {
  return text.length > TEXT_LIMIT ? `${text.slice(0, TEXT_LIMIT - 1)}…` : text;
}
