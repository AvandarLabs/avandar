/**
 * The value at a path of keys inside nested objects and arrays, or
 * undefined. Array indexes are keys too, so `["colors", "primary", "4"]`
 * reads a palette shade.
 */
export function getValueAtPath(
  source: unknown,
  path: readonly string[],
): unknown {
  let value: unknown = source;
  for (const key of path) {
    if (typeof value !== "object" || value === null) {
      return undefined;
    }
    value = (value as Readonly<Record<string, unknown>>)[key];
  }
  return value;
}
