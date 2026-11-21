import { makeResolvedVideoThemeFromSource } from "../../videoTheme/makeResolvedVideoThemeFromSource/makeResolvedVideoThemeFromSource";
import {
  makeVideoMotionFromTokens,
  type VideoMotion,
} from "../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { VideoCssValues } from "../../videoTheme/VideoCssValues/VideoCssValues";
import type {
  ResolvedTypeStyle,
  ResolvedVideoTheme,
} from "../../videoTheme/videoTheme.types";
import type { CSSProperties } from "react";

let classicMotion: VideoMotion | undefined;
/**
 * The `classic` theme, resolved once. Pure stage helpers that take the
 * theme's motion as an argument default to it, for a caller that renders
 * outside any video theme, such as a unit test.
 */
function _getClassicStageTheme(): ResolvedVideoTheme {
  return makeResolvedVideoThemeFromSource(DEFAULT_VIDEO_THEME_SOURCE);
}
/** `VideoMotion` for `classic`, the default of every pure stage helper. */
function _getClassicStageMotion(): VideoMotion {
  classicMotion ??= makeVideoMotionFromTokens(
    _getClassicStageTheme().semantic.motion,
  );
  return classicMotion;
}
/**
 * The CSS of a stage text role: its face, size, weight, and colour, plus
 * its line height and tracking when the role sets them. Pass `fields` to
 * take only some of them, for example a fitted heading that keeps its own
 * size.
 */
function _getStageTextStyle({
  role,
  fields = STAGE_TEXT_FIELDS,
}: Readonly<{
  role: ResolvedTypeStyle;
  fields?: readonly StageTextField[];
}>): CSSProperties {
  const style: CSSProperties = {
    fontFamily: role.fontFamily,
    fontSize: role.fontSize,
    fontWeight: role.fontWeight,
    lineHeight: role.lineHeight,
    letterSpacing:
      role.letterSpacing === undefined ? undefined : `${role.letterSpacing}em`,
    color: VideoCssValues.makeColorFromAlpha({
      color: role.color,
      alpha: role.alpha,
    }),
  };
  return Object.fromEntries(
    fields.flatMap((field) => {
      return style[field] === undefined ? [] : [[field, style[field]]];
    }),
  );
}
/** One CSS property a stage text role sets. */
export type StageTextField = (typeof STAGE_TEXT_FIELDS)[number];
const STAGE_TEXT_FIELDS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "color",
] as const;
/** Provides classic motion defaults and converts stage text roles to CSS. */
export const StageTheme = {
  /** Every CSS property a stage text role can supply. */
  textFields: STAGE_TEXT_FIELDS,
  /** Whether a value names a CSS property a stage text role can supply. */
  isTextField: (value: unknown): value is StageTextField => {
    return STAGE_TEXT_FIELDS.some((field) => {
      return field === value;
    });
  },
  /** The `classic` theme, resolved once. Pure stage helpers that take the
      theme's motion as an argument default to it, for a caller that renders
      outside any video theme, such as a unit test. */
  getClassicStageTheme: _getClassicStageTheme,
  /** `VideoMotion` for `classic`, the default of every pure stage helper. */
  getClassicStageMotion: _getClassicStageMotion,
  /** The CSS of a stage text role: its face, size, weight, and colour, plus
      its line height and tracking when the role sets them. Pass `fields` to
      take only some of them, for example a fitted heading that keeps its own
      size. */
  getStageTextStyle: _getStageTextStyle,
};
