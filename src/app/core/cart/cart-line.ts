export interface CartLine {
  readonly variantId: number;
  readonly quantity: number;
  readonly productName: string;
  readonly sizeLabel: string;
}

export type NewCartLine = Omit<CartLine, 'quantity'>;

interface Quantified {
  readonly quantity: number;
}

export function countUnits(lines: readonly Quantified[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function quantityInCart(lines: readonly CartLine[], variantId: number): number {
  return lines.find((line) => line.variantId === variantId)?.quantity ?? 0;
}

/**
 * @description Adds one unit, never more than the units still available
 */
export function addLine(
  lines: readonly CartLine[],
  item: NewCartLine,
  availableStock: number,
): readonly CartLine[] {
  const quantity = quantityInCart(lines, item.variantId);

  if (quantity >= availableStock) {
    return lines;
  }
  if (quantity === 0) {
    return [...lines, { ...item, quantity: 1 }];
  }

  return lines.map((line) =>
    line.variantId === item.variantId ? { ...line, quantity: quantity + 1 } : line,
  );
}

export function removeLines(
  lines: readonly CartLine[],
  variantIds: readonly number[],
): readonly CartLine[] {
  return lines.filter((line) => !variantIds.includes(line.variantId));
}

export function limitQuantity(
  lines: readonly CartLine[],
  variantId: number,
  maxQuantity: number,
): readonly CartLine[] {
  return lines.map((line) =>
    line.variantId === variantId && line.quantity > maxQuantity
      ? { ...line, quantity: maxQuantity }
      : line,
  );
}

/**
 * @description Reads what the browser stored. Anything broken or unknown is dropped, never thrown
 */
export function parseStoredCart(raw: string | null): readonly CartLine[] {
  const stored = parseJson(raw);

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .filter(isCartLine)
    .filter(
      (line, index, all) => all.findIndex((other) => other.variantId === line.variantId) === index,
    )
    .map(({ variantId, quantity, productName, sizeLabel }) => ({
      variantId,
      quantity,
      productName,
      sizeLabel,
    }));
}

function parseJson(raw: string | null): unknown {
  try {
    return JSON.parse(raw ?? 'null');
  } catch {
    return null;
  }
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const line = value as Record<string, unknown>;

  return (
    isPositiveInteger(line['variantId']) &&
    isPositiveInteger(line['quantity']) &&
    typeof line['productName'] === 'string' &&
    typeof line['sizeLabel'] === 'string'
  );
}

function isPositiveInteger(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) > 0;
}
