import { isMantineTokenRoot } from "../tokenCatalog/tokenCatalog";
import type { ResolvedVideoTheme } from "../videoTheme.types";

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

/**
 * The resolved value of the token at a path such as `color.accent`,
 * `atomic.swatch.mint`, `components.ProgressBar.height`, or a Mantine key
 * such as `fontSizes.md`. Use it where code holds a token path rather than
 * a typed property, for example the editor or the contrast report.
 */
export function getResolvedTokenValue(
  theme: Pick<ResolvedVideoTheme, "atomic" | "semantic" | "components"> &
    Partial<Pick<ResolvedVideoTheme, "mantine">>,
  path: string,
): unknown {
  const [root = "", ...rest] = path.split(".");
  if (root === "atomic") {
    return getValueAtPath(theme.atomic, rest);
  }
  if (root === "components") {
    return getValueAtPath(theme.components, rest);
  }
  if (isMantineTokenRoot(root)) {
    return getValueAtPath(theme.mantine, [root, ...rest]);
  }
  return getValueAtPath(theme.semantic, [root, ...rest]);
}
