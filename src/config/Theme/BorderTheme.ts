/** RGB components of neutral[9], used for hairline borders. */
const NEUTRAL_RGB = "16, 42, 67";

const NEUTRAL_LIGHT_RGB = "217, 226, 236";

/** Tighter radii than Mantine defaults (6–8px for most UI). */
const THEME_RADIUS = {
  xs: "calc(0.25rem * var(--mantine-scale))", // 4px at scale 1 (16px root)
  sm: "calc(0.375rem * var(--mantine-scale))", // 6px at scale 1
  md: "calc(0.5rem * var(--mantine-scale))", // 8px at scale 1
  lg: "calc(0.625rem * var(--mantine-scale))", // 10px at scale 1
  xl: "calc(0.75rem * var(--mantine-scale))", // 12px at scale 1
} as const;

/**
 * Hairline borders that define a surface's edge against the layer behind it.
 *
 * In this system, borders carry most of the elevation; shadows only
 * reinforce the lift. A crisp hairline is what tells the eye "this is a
 * distinct surface"; the shadow tells it "and it's sitting above the
 * background." Always pair an `--ava-border-*` with the matching
 * `--ava-surface-raised`/`--ava-surface-overlay` and an elevation shadow
 * step rather than picking neutral shades by hand. That's how elevations
 * stay consistent across light/dark and across components.
 *
 * Tiers:
 * - `default`: cards, panels, inputs, dropdowns, dividers. The everyday
 *   edge. If a surface is "raised," it should have this border.
 * - `strong`: use only when `default` is too faint for the context, e.g.
 *   a card sitting on a tinted surface that washes the default border out,
 *   or a section divider that needs to read as a structural break.
 * - `focus`: focus rings and active field borders. Signals "this control
 *   is currently active or accepting input." Don't use decoratively.
 *
 * Dark-mode tiers use a light-tinted neutral at higher alpha because
 * light-on-dark reads more faintly per unit alpha than dark-on-light.
 */
const THEME_BORDERS = {
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

/** App-wide border colors and Mantine `theme.radius` scale. */
export const BorderTheme = {
  radius: THEME_RADIUS,
  colors: THEME_BORDERS,
} as const;
