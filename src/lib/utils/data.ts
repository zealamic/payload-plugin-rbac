/**
 * Converts a value to an ID string.
 * @param value - The value to convert.
 * @returns The ID string.
 */
export const toID = (value?: ItemRef) =>
  value ? (typeof value === "object" ? String(value.id) : String(value)) : "";
