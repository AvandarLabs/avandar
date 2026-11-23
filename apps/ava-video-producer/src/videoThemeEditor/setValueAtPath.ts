import { isRecord } from "./isRecord";

/** A copy of a nested object with one value set, creating parents as needed. */
export function setValueAtPath(
  options: Readonly<{
    source: Readonly<Record<string, unknown>>;
    path: readonly string[];
    value: unknown;
  }>,
): Record<string, unknown> {
  const { source, path, value } = options;
  const [key, ...rest] = path;
  if (key === undefined) {
    return source;
  }
  const child = source[key];
  return {
    ...source,
    [key]:
      rest.length === 0
        ? value
        : setValueAtPath({
            source: isRecord(child) ? child : {},
            path: rest,
            value,
          }),
  };
}
