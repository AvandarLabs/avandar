import { MotionSettings } from "./MotionSettings/MotionSettings";
import type {
  MotionOptions,
  MotionSettingsTheme,
} from "./MotionSettings/MotionSettings";
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
export type OverlayTimings = {
  entry: number;
  exit: number;
  fade: number;
};
/**
 * Resolve travel and fade durations, rejecting cues that cannot include a hold.
 */
export function getOverlayTimings({
  cue,
  theme = MotionSettings.getClassicMotionSettingsTheme(),
}: Readonly<{
  cue: OverlayCue;
  theme?: MotionSettingsTheme;
}>): OverlayTimings {
  const entry = MotionSettings.getMotionDuration({
    frames: cue.entryFrames ?? 36,
    options: cue.motion,
    theme,
  });
  const exit = MotionSettings.getMotionDuration({
    frames: cue.exitFrames ?? 30,
    options: cue.motion,
    theme,
  });
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
