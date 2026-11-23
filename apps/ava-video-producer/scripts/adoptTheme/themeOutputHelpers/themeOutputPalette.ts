import type { Palette } from "../adoptTheme.types";
/** Fallback palette for tokens absent from a source stylesheet. */
export const PLACEHOLDER: Readonly<Palette> = {
  "--background": "oklch(0.145 0.02 265)",
  "--foreground": "oklch(0.985 0.003 248)",
  "--card": "oklch(0.205 0.025 265)",
  "--muted": "oklch(0.28 0.028 260)",
  "--muted-foreground": "oklch(0.72 0.03 257)",
  "--border": "oklch(0.3 0.03 260)",
  "--brand": "oklch(0.68 0.19 265)",
  "--brand-soft": "oklch(0.32 0.08 265)",
  "--brand-strong": "oklch(0.82 0.14 265)",
  "--ground": "oklch(0.115 0.025 268)",
  "--radius": "14px",
};
/** Kit custom properties in their CSS output order. */
export const KIT_TOKENS: readonly string[] = Object.keys(PLACEHOLDER);
