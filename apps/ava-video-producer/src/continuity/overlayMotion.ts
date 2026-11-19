import { ramp } from "../motion";

type Interval = { at: number; until: number };

/** How long a notation or connector takes to draw, and on which curve. */
export type DrawTiming = Readonly<{
  duration: number;
  easing: (progress: number) => number;
}>;

/**
 * Draw and retract notation only within its authored interval, each over
 * the theme's annotation draw-in. There is no unthemed default: a missing
 * timing is a caller error.
 */
export function getAnnotationProgress(
  frame: number,
  cue: Interval,
  timing: DrawTiming,
): number {
  const { duration, easing } = timing;
  return (
    ramp(frame, cue.at, duration, easing) *
    (1 - ramp(frame, cue.until - duration, duration, easing))
  );
}

/** Compatibility export for the reusable measured-region overlay. */
export { getOverlayPose } from "../motion-components/AnchoredOverlay";

/**
 * Only a causal treatment draws a connector, after its authored signal cue,
 * over the theme's connector timing.
 */
export function getConnectorProgress(
  frame: number,
  effect: "signal" | "bracket" | "focus",
  signalAt: number,
  timing: DrawTiming,
): number {
  return effect === "signal"
    ? ramp(frame, signalAt, timing.duration, timing.easing)
    : 0;
}
