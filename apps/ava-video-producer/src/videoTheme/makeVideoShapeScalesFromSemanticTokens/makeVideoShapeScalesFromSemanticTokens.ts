import type { ResolvedVideoSemantic } from "../videoTheme.types";

/**
 * The Look and feel line weight, corner style, and tint strength as
 * functions a renderer passes its widths, radii, and wash opacities
 * through, token reads and shape-specific constants alike. At the
 * identity multiplier each returns its input, so `classic` draws as
 * authored.
 */
export type VideoShapeScales = Readonly<{
  /** A stroke width times `stroke.scale`. */
  stroke: (width: number) => number;
  /** A corner radius times `corner.scale`. 0 squares every corner. */
  corner: (radius: number) => number;
  /** A wash or tint opacity times `alpha.washScale`, at most 1. */
  wash: (alpha: number) => number;
}>;

/**
 * Builds `VideoShapeScales` from a theme's semantic tokens. Use it through
 * `useGraphicShapeScales` in stock shapes and `useVideoShapeScales` on the
 * stage, for example to draw a preset's 5 px corner at the theme's style.
 */
export function makeVideoShapeScalesFromSemanticTokens(
  semantic: Pick<ResolvedVideoSemantic, "stroke" | "corner" | "alpha">,
): VideoShapeScales {
  return {
    stroke: (width) => {
      return width * semantic.stroke.scale;
    },
    corner: (radius) => {
      return radius * semantic.corner.scale;
    },
    wash: (alpha) => {
      return Math.min(1, alpha * semantic.alpha.washScale);
    },
  };
}
