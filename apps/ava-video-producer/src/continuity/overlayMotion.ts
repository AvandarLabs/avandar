import { EASE, ramp } from "../motion";

type Interval = { at: number; until: number };

/**
 * Draw and retract notation only within its authored interval, each over
 * `duration` frames (the theme's annotation draw-in; 18 when unthemed).
 */
export function getAnnotationProgress(
  frame: number,
  cue: Interval,
  duration = 18,
): number {
  return (
    ramp(frame, cue.at, duration) *
    (1 - ramp(frame, cue.until - duration, duration))
  );
}

/** Compatibility export for the reusable measured-region overlay. */
export { getOverlayPose } from "../motion-components/AnchoredOverlay";

/**
 * Only a causal treatment draws a connector, after its authored signal cue,
 * over the theme's connector timing (30 frames in-out when unthemed).
 */
export function getConnectorProgress(
  frame: number,
  effect: "signal" | "bracket" | "focus",
  signalAt: number,
  timing: Readonly<{
    duration: number;
    easing: (progress: number) => number;
  }> = {
    duration: 30,
    easing: EASE.inOut,
  },
): number {
  return effect === "signal"
    ? ramp(frame, signalAt, timing.duration, timing.easing)
    : 0;
}
