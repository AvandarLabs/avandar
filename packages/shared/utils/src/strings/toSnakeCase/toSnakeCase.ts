import type { SnakeCase } from "@utils/types/utilities.types.ts";

/**
 * Converts a string to snake_case for object keys.
 *
 * CamelCase boundaries become underscores; existing separators (spaces,
 * hyphens, underscores) split words. The result is lowercased and words are
 * joined with a single underscore.
 *
 * @param input The string to convert.
 * @returns The snake_case string.
 */
export function toSnakeCase<T extends string>(input: T): SnakeCase<T> {
  if (input.length === 0) {
    return "" as SnakeCase<T>;
  }

  const withUnderscores: string = input
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2");
  const lower: string = withUnderscores.toLowerCase();
  const segments: string[] = lower.split(/[^a-z0-9]+/).filter((segment) => {
    return segment.length > 0;
  });

  return segments.join("_") as SnakeCase<T>;
}
