import type {
  ResolvedElevation,
  ResolvedFill,
  ResolvedTextShadow,
} from "../videoTheme.types";
/*
 * CSS strings for resolved theme values, shared by the CSS variables, the
 * Mantine shadow derivation, and HTML layers that style themselves inline.
 */

/**
 * A colour at an opacity, mixed toward transparent so any colour format works.
 */
function _makeColorFromAlpha({
  color,
  alpha,
}: Readonly<{
  color: string;
  alpha: number;
}>): string {
  return alpha >= 1
    ? color
    : `color-mix(in srgb, ${color} ${Number((alpha * 100).toFixed(4))}%, transparent)`;
}
/** A CSS `box-shadow` value with one shadow per elevation layer. */
function _makeBoxShadowFromElevation(elevation: ResolvedElevation): string {
  return elevation.layers.length === 0
    ? "none"
    : elevation.layers
        .map((layer) => {
          return `${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${layer.spread}px ${_makeColorFromAlpha(
            {
              color: elevation.color,
              alpha: layer.alpha,
            },
          )}`;
        })
        .join(", ");
}
/**
 * A CSS `filter` value with one `drop-shadow()` per elevation layer, for
 * shapes whose outline is not a box. `drop-shadow` has no spread, so spread
 * is ignored.
 */
function _makeDropShadowFilterFromElevation(
  elevation: ResolvedElevation,
): string {
  return elevation.layers.length === 0
    ? "none"
    : elevation.layers
        .map((layer) => {
          return `drop-shadow(${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${_makeColorFromAlpha(
            {
              color: elevation.color,
              alpha: layer.alpha,
            },
          )})`;
        })
        .join(" ");
}
/** A CSS `text-shadow` value. */
function _makeCssFromTextShadow(shadow: ResolvedTextShadow): string {
  return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${_makeColorFromAlpha(
    {
      color: shadow.color,
      alpha: shadow.alpha,
    },
  )}`;
}
/** A CSS `background` value for a ground fill. */
function _makeCssFromFill(fill: ResolvedFill): string {
  return fill.type === "solid"
    ? fill.color
    : `linear-gradient(${fill.deg}deg, ${fill.from}, ${fill.to})`;
}

/**
 * Converts theme paint, shadow, and elevation values into CSS for renderers.
 */
export const VideoCssValues = {
  /**
   * A colour at an opacity, mixed toward transparent so any colour format
   * works.
   */
  makeColorFromAlpha: _makeColorFromAlpha,
  /** A CSS `box-shadow` value with one shadow per elevation layer. */
  makeBoxShadowFromElevation: _makeBoxShadowFromElevation,
  /**
   * A CSS `filter` value with one `drop-shadow()` per elevation layer, for
   * shapes whose outline is not a box.
   */
  makeDropShadowFilterFromElevation: _makeDropShadowFilterFromElevation,
  /** A CSS `text-shadow` value. */
  makeCssFromTextShadow: _makeCssFromTextShadow,
  /** A CSS `background` value for a ground fill. */
  makeCssFromFill: _makeCssFromFill,
};
