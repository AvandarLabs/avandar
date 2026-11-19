/*
 * CSS strings for resolved theme values, shared by the CSS variables, the
 * Mantine shadow derivation, and HTML layers that style themselves inline.
 */
import type {
  ResolvedElevation,
  ResolvedFill,
  ResolvedTextShadow,
} from "../videoTheme.types";

/** A colour at an opacity, mixed toward transparent so any colour format works. */
export function buildColorWithAlpha(color: string, alpha: number): string {
  if (alpha >= 1) {
    return color;
  }
  return `color-mix(in srgb, ${color} ${Number((alpha * 100).toFixed(4))}%, transparent)`;
}

/** A CSS `box-shadow` value with one shadow per elevation layer. */
export function elevationToBoxShadow(elevation: ResolvedElevation): string {
  if (elevation.layers.length === 0) {
    return "none";
  }
  return elevation.layers
    .map((layer) => {
      return `${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${layer.spread}px ${buildColorWithAlpha(elevation.color, layer.alpha)}`;
    })
    .join(", ");
}

/**
 * A CSS `filter` value with one `drop-shadow()` per elevation layer, for
 * shapes whose outline is not a box. `drop-shadow` has no spread, so spread
 * is ignored.
 */
export function elevationToDropShadowFilter(
  elevation: ResolvedElevation,
): string {
  if (elevation.layers.length === 0) {
    return "none";
  }
  return elevation.layers
    .map((layer) => {
      return `drop-shadow(${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${buildColorWithAlpha(elevation.color, layer.alpha)})`;
    })
    .join(" ");
}

/** A CSS `text-shadow` value. */
export function textShadowToCss(shadow: ResolvedTextShadow): string {
  return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${buildColorWithAlpha(shadow.color, shadow.alpha)}`;
}

/** A CSS `background` value for a ground fill. */
export function fillToCss(fill: ResolvedFill): string {
  return fill.type === "solid"
    ? fill.color
    : `linear-gradient(${fill.deg}deg, ${fill.from}, ${fill.to})`;
}
