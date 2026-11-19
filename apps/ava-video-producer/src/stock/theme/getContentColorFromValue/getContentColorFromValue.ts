import { z } from "zod";
import { SEMANTIC_TOKENS } from "../../../videoTheme/tokenCatalog/semanticTokens/semanticTokens";
import { legacyColorSchema } from "../../presets/legacy/legacyColorSchema.constants";
import type { ResolvedVideoSemantic } from "../../../videoTheme/videoTheme.types";

const COLOR_ROLES = Object.entries(SEMANTIC_TOKENS.color)
  .filter(([, definition]) => {
    return definition.kind === "color";
  })
  .map(([role]) => {
    return role;
  });

/** A content colour that follows the theme, such as `$color.accentAlt`. */
export const contentColorRoleSchema = z
  .string()
  .regex(
    new RegExp(`^\\$color\\.(?:${COLOR_ROLES.join("|")})$`),
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
  const role = /^\$color\.([A-Za-z]+)$/.exec(value)?.[1];
  const color =
    role && COLOR_ROLES.includes(role)
      ? (options.tokens.color as Readonly<Record<string, unknown>>)[role]
      : undefined;
  return typeof color === "string" ? color : value;
}
