import type { FloatingOptions } from "react-joyride";

/**
 * Shared Floating UI options for the NUX tour.
 *
 * Joyride already picks sensible flip fallbacks per placement. Do not override
 * `fallbackPlacements` with a list that omits `bottom`, or `top`-placed
 * tooltips cannot escape a target hugging the viewport edge. Every step is
 * `isFixed`, so flipping below a tall target no longer stretches the page.
 */
export function buildNuxTourFloatingOptions(): FloatingOptions {
  return {
    shiftOptions: { padding: 16 },
    flipOptions: { padding: 16 },
  };
}
