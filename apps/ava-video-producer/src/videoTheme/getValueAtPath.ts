/**
 * The value at a path of keys inside nested objects and arrays, or
 * undefined. Array indexes are keys too, so `["colors", "primary", "4"]`
 * reads a palette shade.
 */
export function getValueAtPath({
  source,
  path,
}: Readonly<{
  source: unknown;
  path: readonly string[];
}>): unknown {
  let value: unknown = source;
  const failedSegmentIndex = path.findIndex((key) => {
    const isMissingContainer = typeof value !== "object" || value === null;
    if (!isMissingContainer) {
      value = (value as Readonly<Record<string, unknown>>)[key];
    }
    return isMissingContainer;
  });
  return failedSegmentIndex === -1 ? value : undefined;
}
