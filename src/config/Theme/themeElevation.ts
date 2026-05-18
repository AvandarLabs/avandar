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

/** Tighter radii than Mantine defaults (6–8px for most UI). */
export const ELEVATION_RADIUS = {
  xs: "calc(0.25rem * var(--mantine-scale))",
  sm: "calc(0.375rem * var(--mantine-scale))",
  md: "calc(0.5rem * var(--mantine-scale))",
  lg: "calc(0.625rem * var(--mantine-scale))",
  xl: "calc(0.75rem * var(--mantine-scale))",
} as const;

const NEUTRAL_LIGHT_RGB = "217, 226, 236";

/**
 * Hairline borders that define a surface's edge against the layer behind it.
 *
 * In this system, borders carry most of the elevation — shadows only
 * reinforce the lift. A crisp hairline is what tells the eye "this is a
 * distinct surface"; the shadow tells it "and it's sitting above the
 * background." Always pair an `--ava-border-*` with the matching
 * `--ava-surface-raised`/`--ava-surface-overlay` and an `ELEVATION_SHADOWS`
 * step rather than picking neutral shades by hand — that's how elevations
 * stay consistent across light/dark and across components.
 *
 * Tiers:
 * - `default`: cards, panels, inputs, dropdowns, dividers. The everyday
 *   edge. If a surface is "raised," it should have this border.
 * - `strong`: use only when `default` is too faint for the context — e.g.
 *   a card sitting on a tinted surface that washes the default border out,
 *   or a section divider that needs to read as a structural break.
 * - `focus`: focus rings and active field borders. Signals "this control
 *   is currently active or accepting input." Don't use decoratively.
 *
 * Dark-mode tiers use a light-tinted neutral at higher alpha because
 * light-on-dark reads more faintly per unit alpha than dark-on-light.
 */
export const ELEVATION_BORDERS = {
  light: {
    default: `rgba(${NEUTRAL_RGB}, 0.20)`,
    strong: `rgba(${NEUTRAL_RGB}, 0.32)`,
    focus: `rgba(${NEUTRAL_RGB}, 0.44)`,
  },
  dark: {
    default: `rgba(${NEUTRAL_LIGHT_RGB}, 0.28)`,
    strong: `rgba(${NEUTRAL_LIGHT_RGB}, 0.4)`,
    focus: `rgba(${NEUTRAL_LIGHT_RGB}, 0.55)`,
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
