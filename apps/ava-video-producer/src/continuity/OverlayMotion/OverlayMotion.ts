import { Motion } from "../../motion";
import type { ContinuityBeat } from "../continuitySchema/continuitySchema";

type GetConnectorProgressOptions = {
  frame: number;
  effect: Extract<ContinuityBeat["content"], { kind: "composite" }>["effect"];
  signalAt: number;
  timing: Readonly<DrawTiming>;
};
type Interval = {
  at: number;
  until: number;
};
/** How long a notation or connector takes to draw, and on which curve. */
export type DrawTiming = {
  duration: number;
  easing: (progress: number) => number;
};
/**
 * Draw and retract notation only within its authored interval, each over
 * the theme's annotation draw-in. There is no unthemed default: a missing
 * timing is a caller error.
 */
function _getAnnotationProgress({
  frame,
  cue,
  timing,
}: Readonly<{
  frame: number;
  cue: Interval;
  timing: Readonly<DrawTiming>;
}>): number {
  const { duration, easing } = timing;
  return (
    Motion.ramp({
      frame,
      at: cue.at,
      dur: duration,
      easing,
    }) *
    (1 -
      Motion.ramp({
        frame,
        at: cue.until - duration,
        dur: duration,
        easing,
      }))
  );
}
/** Compatibility export for the reusable measured-region overlay. */
export { getOverlayPose } from "../../motion-components/getOverlayPose";
/**
 * Only a causal treatment draws a connector, after its authored signal cue,
 * over the theme's connector timing.
 */
function _getConnectorProgress({
  frame,
  effect,
  signalAt,
  timing,
}: Readonly<GetConnectorProgressOptions>): number {
  return effect === "signal"
    ? Motion.ramp({
        frame,
        at: signalAt,
        dur: timing.duration,
        easing: timing.easing,
      })
    : 0;
}

/** Samples annotation and connector progress for continuity callouts. */
export const OverlayMotion = {
  /**
   * Draw and retract notation only within its authored interval, each over the
   * theme's annotation draw-in.
   */
  getAnnotationProgress: _getAnnotationProgress,
  /**
   * Only a causal treatment draws a connector, after its authored signal cue,
   * over the theme's connector timing.
   */
  getConnectorProgress: _getConnectorProgress,
};
