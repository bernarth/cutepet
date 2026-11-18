/**
 * @description Position for a new item, after the last one
 */
export function nextSortOrder(items: readonly { readonly sortOrder: number }[]): number {
  return items.reduce((highest, item) => Math.max(highest, item.sortOrder), 0) + 1;
}
