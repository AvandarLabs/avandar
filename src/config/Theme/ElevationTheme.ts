import { NEUTRAL_SHADES } from "../../../shared/config/Theme";

/** RGB components of neutral[9], used to tint shadows. */
const NEUTRAL_RGB = "16, 42, 67";

type StackedShadowLayer = {
  offsetY: number;
  blur: number;
  alpha: number;
};

type StackedShadowOptions = {
  /** Tight, low-offset layer */
  sharp: StackedShadowLayer;
  /** Slightly larger soft layer */
  soft: StackedShadowLayer;
};

/**
 * Stacked elevation shadow: tight offset + soft spread, low opacity.
 * Hairline borders carry most elevation; shadows reinforce lift.
 */
function stackedShadow({ sharp, soft }: StackedShadowOptions): string {
  return `0 ${sharp.offsetY}px ${sharp.blur}px rgba(${NEUTRAL_RGB}, ${sharp.alpha}), 0 ${soft.offsetY}px ${soft.blur}px rgba(${NEUTRAL_RGB}, ${soft.alpha})`;
}

const ELEVATION_SHADOWS = {
  xs: stackedShadow({
    sharp: { offsetY: 1, blur: 1, alpha: 0.08 },
    soft: { offsetY: 1, blur: 2, alpha: 0.05 },
  }),
  sm: stackedShadow({
    sharp: { offsetY: 1, blur: 2, alpha: 0.1 },
    soft: { offsetY: 2, blur: 5, alpha: 0.06 },
  }),
  md: stackedShadow({
    sharp: { offsetY: 2, blur: 3, alpha: 0.1 },
    soft: { offsetY: 4, blur: 10, alpha: 0.07 },
  }),
  lg: stackedShadow({
    sharp: { offsetY: 3, blur: 4, alpha: 0.11 },
    soft: { offsetY: 8, blur: 20, alpha: 0.08 },
  }),
  xl: stackedShadow({
    sharp: { offsetY: 4, blur: 6, alpha: 0.12 },
    soft: { offsetY: 14, blur: 32, alpha: 0.1 },
  }),
} as const;

/** Surface steps for light mode (body → raised → overlay). */
const ELEVATION_SURFACES_LIGHT = {
  body: NEUTRAL_SHADES[0],
  raised: "#ffffff",
  overlay: "#ffffff",
  sunken: NEUTRAL_SHADES[1],
} as const;

/**
 * Dark mode: each layer is slightly lighter than the one beneath.
 */
const ELEVATION_SURFACES_DARK = {
  body: NEUTRAL_SHADES[9],
  raised: NEUTRAL_SHADES[8],
  overlay: NEUTRAL_SHADES[7],
  sunken: NEUTRAL_SHADES[9],
} as const;

const ELEVATION_SURFACES = {
  light: ELEVATION_SURFACES_LIGHT,
  dark: ELEVATION_SURFACES_DARK,
} as const;

/** Shadows and surface steps for visual hierarchy (light/dark). */
export const ElevationTheme = {
  shadows: ELEVATION_SHADOWS,
  surfaces: ELEVATION_SURFACES,
  surfacesLight: ELEVATION_SURFACES_LIGHT,
  surfacesDark: ELEVATION_SURFACES_DARK,
} as const;
