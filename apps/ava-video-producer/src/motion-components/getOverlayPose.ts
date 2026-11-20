import { mix } from "../motion";
import { OverlayCue, MotionRect, getOverlayTimings } from "./getOverlayTimings";
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
    at: cue.until - timing.exit,
    duration: cue.exitFrames ?? 30,
    options: cue.motion,
    fallback: undefined,
    theme,
  });
  const { motion } = theme;
  const fade = motion.reveal.easing;
  const travel = departure * (1 - arrival);
  const originX = source.x + source.width / 2 - cue.target.width / 2;
  const originY = source.y + source.height / 2 - cue.target.height / 2;
  return {
    x: mix(travel, originX, cue.target.x),
    y: mix(travel, originY, cue.target.y),
    opacity:
      motion.ramp(frame, cue.at, timing.fade, fade) *
      (1 - motion.ramp(frame, cue.until - timing.fade, timing.fade, fade)),
    scale: mix(travel, 0.88, 1),
  };
}
