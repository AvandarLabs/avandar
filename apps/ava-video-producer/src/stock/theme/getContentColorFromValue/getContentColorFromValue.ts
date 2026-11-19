import { z } from "zod";
import { getValueAtPath } from "../../../videoTheme/getValueAtPath";
import { listTokenDefinitions } from "../../../videoTheme/tokenCatalog/tokenCatalogHelpers";
import { legacyColorSchema } from "../../presets/legacy/legacyColorSchema.constants";
import type { ResolvedVideoSemantic } from "../../../videoTheme/videoTheme.types";

/**
 * Every colour role a content colour may name, by its path under `color`,
 * such as `accentAlt` or `categorical.3`.
 */
const COLOR_ROLES = listTokenDefinitions().flatMap(({ path, definition }) => {
  return path.startsWith("color.") && definition.kind === "color"
    ? [path.slice("color.".length)]
    : [];
});

/**
 * A content colour that follows the theme, such as `$color.accentAlt` or
 * `$color.categorical.3`.
 */
export const contentColorRoleSchema = z.string().regex(
  new RegExp(
    `^\\$color\\.(?:${COLOR_ROLES.map((role) => {
      return role.replaceAll(".", "\\.");
    }).join("|")})$`,
  ),
  "Expected a colour role such as $color.accent",
);

/**
 * A colour field in stock content: a semantic colour role that follows the
 * theme, or a literal hex that deliberately bypasses the theme for that
 * one piece of content.
 */
export const contentColorSchema = z.union([
  legacyColorSchema,
  contentColorRoleSchema,
]);

/**
 * The colour a content colour field draws with. `accent` is the legacy
 * keyword some content uses for the graphic's accent.
 */
export function getContentColorFromValue(
  value: string,
  options: Readonly<{ tokens: ResolvedVideoSemantic; accent: string }>,
): string {
  if (value === "accent") {
    return options.accent;
  }
  const role = /^\$color\.([A-Za-z0-9.]+)$/.exec(value)?.[1];
  const color =
    role && COLOR_ROLES.includes(role)
      ? getValueAtPath(options.tokens.color, role.split("."))
      : undefined;
  return typeof color === "string" ? color : value;
}
