import { NEUTRAL_SHADES } from "../../../shared/config/Theme";

/** RGB components of neutral[9], used to tint shadows and borders. */
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
 * Borders carry most elevation; shadows reinforce lift.
 */
function stackedShadow({ sharp, soft }: StackedShadowOptions): string {
  return `0 ${sharp.offsetY}px ${sharp.blur}px rgba(${NEUTRAL_RGB}, ${sharp.alpha}), 0 ${soft.offsetY}px ${soft.blur}px rgba(${NEUTRAL_RGB}, ${soft.alpha})`;
}

export const ELEVATION_SHADOWS = {
  xs: stackedShadow({
    sharp: { offsetY: 1, blur: 1, alpha: 0.06 },
    soft: { offsetY: 1, blur: 2, alpha: 0.04 },
  }),
  sm: stackedShadow({
    sharp: { offsetY: 1, blur: 2, alpha: 0.06 },
    soft: { offsetY: 2, blur: 4, alpha: 0.05 },
  }),
  md: stackedShadow({
    sharp: { offsetY: 1, blur: 3, alpha: 0.07 },
    soft: { offsetY: 2, blur: 6, alpha: 0.05 },
  }),
  lg: stackedShadow({
    sharp: { offsetY: 1, blur: 4, alpha: 0.08 },
    soft: { offsetY: 3, blur: 10, alpha: 0.06 },
  }),
  xl: stackedShadow({
    sharp: { offsetY: 2, blur: 6, alpha: 0.08 },
    soft: { offsetY: 4, blur: 14, alpha: 0.06 },
  }),
} as const;

/** Tighter radii than Mantine defaults (6–8px for most UI). */
export const ELEVATION_RADIUS = {
  xs: "calc(0.25rem * var(--mantine-scale))",
  sm: "calc(0.375rem * var(--mantine-scale))",
  md: "calc(0.5rem * var(--mantine-scale))",
  lg: "calc(0.625rem * var(--mantine-scale))",
  xl: "calc(0.75rem * var(--mantine-scale))",
} as const;

const NEUTRAL_LIGHT_RGB = "217, 226, 236";

export const ELEVATION_BORDERS = {
  light: {
    default: `rgba(${NEUTRAL_RGB}, 0.1)`,
    strong: `rgba(${NEUTRAL_RGB}, 0.14)`,
    focus: `rgba(${NEUTRAL_RGB}, 0.22)`,
  },
  dark: {
    default: `rgba(${NEUTRAL_LIGHT_RGB}, 0.12)`,
    strong: `rgba(${NEUTRAL_LIGHT_RGB}, 0.18)`,
    focus: `rgba(${NEUTRAL_LIGHT_RGB}, 0.28)`,
  },
} as const;

/** Surface steps for light mode (body → raised → overlay). */
export const ELEVATION_SURFACES_LIGHT = {
  body: NEUTRAL_SHADES[0],
  raised: "#ffffff",
  overlay: "#ffffff",
  sunken: NEUTRAL_SHADES[1],
} as const;

/**
 * Dark mode: each layer is slightly lighter than the one beneath.
 */
export const ELEVATION_SURFACES_DARK = {
  body: NEUTRAL_SHADES[9],
  raised: NEUTRAL_SHADES[8],
  overlay: NEUTRAL_SHADES[7],
  sunken: NEUTRAL_SHADES[9],
} as const;

export const ELEVATION_SURFACES = {
  light: ELEVATION_SURFACES_LIGHT,
  dark: ELEVATION_SURFACES_DARK,
} as const;
