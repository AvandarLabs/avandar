import { mix, ramp } from "../motion";
import { getOverlayTimings } from "./getOverlayTimings";
import { getMotionProgress } from "./motionSettings";
import type { MotionRect, OverlayCue } from "./getOverlayTimings";

/** Where an overlay sits, how opaque it is, and its scale on one frame. */
export type OverlayPose = {
  x: number;
  y: number;
  opacity: number;
  scale: number;
};

/**
 * The pose (x, y, opacity, scale) of an anchored overlay on one frame. The
 * overlay rises from the center of the measured source rect to the cue's
 * target, then returns to the source before its cue ends. Use it to place
 * overlay artwork without moving the source UI.
 */
export function getOverlayPose(
  frame: number,
  cue: OverlayCue,
  source: MotionRect,
): OverlayPose {
  const timing = getOverlayTimings(cue);
  const departure = getMotionProgress(
    frame,
    cue.at,
    cue.entryFrames ?? 36,
    cue.motion,
  );
  const arrival = getMotionProgress(
    frame,
    cue.until - timing.exit,
    cue.exitFrames ?? 30,
    cue.motion,
  );
  const travel = departure * (1 - arrival);
  const originX = source.x + source.width / 2 - cue.target.width / 2;
  const originY = source.y + source.height / 2 - cue.target.height / 2;
  return {
    x: mix(travel, originX, cue.target.x),
    y: mix(travel, originY, cue.target.y),
    opacity:
      ramp(frame, cue.at, timing.fade) *
      (1 - ramp(frame, cue.until - timing.fade, timing.fade)),
    scale: mix(travel, 0.88, 1),
  };
}
