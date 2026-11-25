import { Motion } from "../motion";
import {
  type OverlayCue,
  type MotionRect,
  getOverlayTimings,
} from "./getOverlayTimings";
import { MotionSettings } from "./MotionSettings/MotionSettings";
import type { MotionSettingsTheme } from "./MotionSettings/MotionSettings";

type GetOverlayPoseOptions = {
  frame: number;
  cue: OverlayCue;
  source: MotionRect;
  theme?: MotionSettingsTheme;
};
/** Where an overlay sits, how opaque it is, and its scale on one frame. */
export type OverlayPose = {
  x: number;
  y: number;
  opacity: number;
  scale: number;
};
/**
 * Floating artwork originates at a measured region without moving the source
 * UI, fading in and out on the theme's reveal curve.
 */
export function getOverlayPose({
  frame,
  cue,
  source,
  theme = MotionSettings.getClassicMotionSettingsTheme(),
}: Readonly<GetOverlayPoseOptions>): OverlayPose {
  const timing = getOverlayTimings({ cue, theme });
  const travel = _getOverlayTravelFromCue({
    frame,
    cue,
    theme,
    exit: timing.exit,
  });
  const { motion } = theme;
  const fade = motion.reveal.easing;
  const originX = source.x + source.width / 2 - cue.target.width / 2;
  const originY = source.y + source.height / 2 - cue.target.height / 2;
  return {
    x: Motion.mix({
      t: travel,
      from: originX,
      to: cue.target.x,
    }),
    y: Motion.mix({
      t: travel,
      from: originY,
      to: cue.target.y,
    }),
    opacity:
      motion.ramp(frame, cue.at, timing.fade, fade) *
      (1 - motion.ramp(frame, cue.until - timing.fade, timing.fade, fade)),
    scale: Motion.mix({
      t: travel,
      from: 0.88,
      to: 1,
    }),
  };
}

/** Samples an overlay's combined departure and arrival progress. */
function _getOverlayTravelFromCue({
  frame,
  cue,
  theme,
  exit,
}: Readonly<{
  frame: number;
  cue: OverlayCue;
  theme: MotionSettingsTheme;
  exit: number;
}>): number {
  const departure = MotionSettings.getMotionProgress({
    frame,
    at: cue.at,
    duration: cue.entryFrames ?? 36,
    options: cue.motion,
    fallback: undefined,
    theme,
  });
  const arrival = MotionSettings.getMotionProgress({
    frame,
    at: cue.until - exit,
    duration: cue.exitFrames ?? 30,
    options: cue.motion,
    fallback: undefined,
    theme,
  });
  return departure * (1 - arrival);
}
