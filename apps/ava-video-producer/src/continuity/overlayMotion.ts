import { EASE, ramp } from "../motion";

type Interval = { at: number; until: number };
/** Draw and retract notation only within its authored interval. */
export function getAnnotationProgress(frame: number, cue: Interval): number {
  return ramp(frame, cue.at, 18) * (1 - ramp(frame, cue.until - 18, 18));
}

/** Compatibility export for the reusable measured-region overlay. */
export { getOverlayPose } from "../motion-components/AnchoredOverlay";

/** Only a causal treatment draws a connector, after its authored signal cue. */
export function getConnectorProgress(
  frame: number,
  effect: "signal" | "bracket" | "focus",
  signalAt: number,
): number {
  return effect === "signal" ? ramp(frame, signalAt, 30, EASE.inOut) : 0;
}
