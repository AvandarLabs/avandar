import type { ResolvedTypeStyle } from "../../videoTheme/videoTheme.types";

/**
 * A text role's tracking in pixels at a font size, for SVG `letterSpacing`
 * on text drawn in that role, such as `Text` and `FitText`. Undefined when
 * the role sets no tracking.
 */
export function getLetterSpacingFromTypeStyle(
  style: Pick<ResolvedTypeStyle, "letterSpacing">,
  fontSize: number,
): number | undefined {
  return style.letterSpacing === undefined
    ? undefined
    : Number((style.letterSpacing * fontSize).toFixed(4));
}
