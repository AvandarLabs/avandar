/** Reads one JSON-compatible field without interpreting IDs or references. */
export function getStockValueFromPath({
  value,
  path,
}: {
  value: unknown;
  path: ReadonlyArray<string | number>;
}): unknown {
  return path.reduce<unknown>(
    (item, key) =>
      item !== null && typeof item === "object"
        ? Reflect.get(item, key)
        : undefined,
    value,
  );
}
