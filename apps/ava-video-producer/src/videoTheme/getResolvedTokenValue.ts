import { getValueAtPath } from "./getValueAtPath";
import { TokenCatalog } from "./tokenCatalog/TokenCatalog/TokenCatalog";
import type { ResolvedVideoTheme } from "./videoTheme.types";
/**
 * The resolved value of the token at a path such as `color.accent`,
 * `atomic.swatch.mint`, `components.ProgressBar.height`, or a Mantine key
 * such as `fontSizes.md`. Use it where code holds a token path rather than
 * a typed property, for example the editor or the contrast report.
 */
export function getResolvedTokenValue({
  theme,
  path,
}: Readonly<{
  theme: Pick<ResolvedVideoTheme, "atomic" | "semantic" | "components"> &
    Partial<Pick<ResolvedVideoTheme, "mantine">>;
  path: string;
}>): unknown {
  const [root = "", ...rest] = path.split(".");
  if (root === "atomic") {
    return getValueAtPath({
      source: theme.atomic,
      path: rest,
    });
  }
  if (root === "components") {
    return getValueAtPath({
      source: theme.components,
      path: rest,
    });
  }
  return TokenCatalog.isMantineTokenRoot(root)
    ? getValueAtPath({
        source: theme.mantine,
        path: [root, ...rest],
      })
    : getValueAtPath({
        source: theme.semantic,
        path: [root, ...rest],
      });
}
