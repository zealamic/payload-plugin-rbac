/**
 * Converts a value to an ID string.
 * @param value - The value to convert.
 * @returns The ID string.
 */
export const toID = (value?: ItemRef) =>
  value ? (typeof value === "object" ? String(value.id) : String(value)) : "";

/**
 * Sorts an array of items by their sort order.
 * @param items - The items to sort.
 * @returns The sorted items.
 */
export const sortByOrder = <T extends { sortOrder?: number | null }>(items: T[]) =>
  [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
