import { getMotionDuration } from "./motionSettings";
import type { MotionOptions } from "./motionSettings";

/** Measured geometry in the enclosing composition's coordinate system. */
export type MotionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
/**
 * A complete trip with a stationary reading interval and a return to its
 * source.
 */
export type OverlayCue = {
  at: number;
  until: number;
  target: MotionRect;
  entryFrames?: number;
  exitFrames?: number;
  fadeFrames?: number;
  motion?: MotionOptions;
};

/** Resolved travel and fade durations of an overlay cue, in frames. */
export type OverlayTimings = { entry: number; exit: number; fade: number };

/**
 * Resolve travel and fade durations, rejecting cues that cannot include a hold.
 */
export function getOverlayTimings(cue: OverlayCue): OverlayTimings {
  const entry = getMotionDuration(cue.entryFrames ?? 36, cue.motion);
  const exit = getMotionDuration(cue.exitFrames ?? 30, cue.motion);
  const fade = cue.fadeFrames ?? 20;
  if (
    entry < 1 ||
    exit < 1 ||
    fade < 1 ||
    !Number.isInteger(fade) ||
    cue.until - cue.at <= Math.max(entry + exit, fade * 2)
  ) {
    throw new Error("Overlay needs travel, fade and a reading hold");
  }
  return { entry, exit, fade };
}
