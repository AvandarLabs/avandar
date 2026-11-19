import type { ResolvedVideoAtomic } from "../../../videoTheme/videoTheme.types";

/** A solid outline, written as a dash so every footprint draws the same way. */
const SOLID_DASH = "1 0";
/** The dash-dot outline of the fourth footprint; no theme step draws it. */
const DASH_DOT = "10 3 2 3";

/**
 * Each footprint keeps its own dash so overlapping outlines stay distinct.
 * The legend swatches use the same dashes.
 */
export function getFootprintDashFromIndex(
  atomic: ResolvedVideoAtomic,
  index: number,
): string | undefined {
  return [
    SOLID_DASH,
    atomic.dash.bold.join(" "),
    atomic.dash.dotted.join(" "),
    DASH_DOT,
  ][index];
}
