import { MONO, TYPE } from "../../../fonts";
import theme from "../../theme-colors.json";
import type { CSSProperties } from "react";

/** Avandar theme colours the helper previews draw with. */
export const DEMO_COLORS = {
  ground: theme.surfaces.dark.body,
  panel: theme.surfaces.dark.raised,
  line: theme.neutral[7],
  text: theme.neutral[0],
  muted: theme.neutral[3],
  brand: theme.brand,
  accent: theme.primary[4],
  highlight: theme.secondary[5],
  success: theme.success[6],
} as const;

/**
 * Custom properties set on every preview root: the preview palette for the
 * CSS modules, and the starter theme tokens (`--brand`, `--border`...) that
 * helpers such as `mixToken` and `WINDOW_SHADOW` read, mapped to Avandar
 * colours.
 */
export const DEMO_THEME_STYLE = {
  "--demo-ground": DEMO_COLORS.ground,
  "--demo-panel": DEMO_COLORS.panel,
  "--demo-line": DEMO_COLORS.line,
  "--demo-text": DEMO_COLORS.text,
  "--demo-muted": DEMO_COLORS.muted,
  "--demo-brand": DEMO_COLORS.brand,
  "--demo-accent": DEMO_COLORS.accent,
  "--demo-highlight": DEMO_COLORS.highlight,
  "--demo-success": DEMO_COLORS.success,
  "--demo-font": TYPE,
  "--demo-mono": MONO,
  "--background": DEMO_COLORS.ground,
  "--foreground": DEMO_COLORS.text,
  "--card": DEMO_COLORS.panel,
  "--border": DEMO_COLORS.line,
  "--brand": DEMO_COLORS.brand,
  "--ground": DEMO_COLORS.ground,
} as CSSProperties;

/** Formats a live readout value with a fixed number of decimals. */
export function formatReadout(value: number, digits = 2): string {
  return value.toFixed(digits);
}
