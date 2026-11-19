import { DEFAULT_VIDEO_THEME_SOURCE } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import {
  createVideoMotion,
  type VideoMotion,
} from "../../videoTheme/createVideoMotion/createVideoMotion";
import { buildColorWithAlpha } from "../../videoTheme/cssValueHelpers/cssValueHelpers";
import { makeResolvedVideoThemeFromSource } from "../../videoTheme/makeResolvedVideoThemeFromSource/makeResolvedVideoThemeFromSource";
import type {
  ResolvedTypeStyle,
  ResolvedVideoTheme,
} from "../../videoTheme/videoTheme.types";
import type { CSSProperties } from "react";

let classicMotion: VideoMotion | undefined;

/**
 * The `classic` theme, resolved once. Stage helpers that take the theme's
 * motion as an argument default to it, so a caller that has not moved to the
 * theme yet still draws today's look.
 */
export function getClassicStageTheme(): ResolvedVideoTheme {
  return makeResolvedVideoThemeFromSource(DEFAULT_VIDEO_THEME_SOURCE);
}

/** `VideoMotion` for `classic`, the default of every pure stage helper. */
export function getClassicStageMotion(): VideoMotion {
  classicMotion ??= createVideoMotion(getClassicStageTheme().semantic.motion);
  return classicMotion;
}

/**
 * The CSS of a stage text role: its face, size, weight, and colour, plus
 * its line height and tracking when the role sets them. Pass `fields` to
 * take only some of them, for example a fitted heading that keeps its own
 * size.
 */
export function getStageTextStyle(
  role: ResolvedTypeStyle,
  fields: readonly StageTextField[] = STAGE_TEXT_FIELDS,
): CSSProperties {
  const style: CSSProperties = {
    fontFamily: role.fontFamily,
    fontSize: role.fontSize,
    fontWeight: role.fontWeight,
    lineHeight: role.lineHeight,
    letterSpacing:
      role.letterSpacing === undefined ? undefined : `${role.letterSpacing}em`,
    color: buildColorWithAlpha(role.color, role.alpha),
  };
  return Object.fromEntries(
    fields.flatMap((field) => {
      return style[field] === undefined ? [] : [[field, style[field]]];
    }),
  );
}

/** One CSS property a stage text role sets. */
export type StageTextField =
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "lineHeight"
  | "letterSpacing"
  | "color";

const STAGE_TEXT_FIELDS: readonly StageTextField[] = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "color",
];
