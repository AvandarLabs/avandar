import { isRecord } from "./isRecord";

/** A copy of a nested object with one value removed and empty parents pruned. */
export function removeValueAtPath(
  options: Readonly<{
    source: Readonly<Record<string, unknown>>;
    path: readonly string[];
  }>,
): Record<string, unknown> {
  const { source, path } = options;
  const [key, ...rest] = path;
  if (key === undefined || !Object.hasOwn(source, key)) {
    return source;
  }
  if (rest.length === 0) {
    return Object.fromEntries(
      Object.entries(source).filter(([entry]) => {
        return entry !== key;
      }),
    );
  }
  const child = source[key];
  if (!isRecord(child)) {
    return source;
  }
  const pruned = removeValueAtPath({ source: child, path: rest });
  return Object.keys(pruned).length === 0
    ? removeValueAtPath({ source, path: [key] })
    : { ...source, [key]: pruned };
}
