import { mix } from "../../motion";
import { MotionSettings } from "../MotionSettings/MotionSettings";
import type {
  MotionOptions,
  MotionSettingsTheme,
} from "../MotionSettings/MotionSettings";
import type { CSSProperties, ReactNode } from "react";

type GetOverlayPoseOptions = {
  frame: number;
  cue: OverlayCue;
  source: MotionRect;
  theme?: MotionSettingsTheme;
};
type Props = {
  children: ReactNode;
  frame: number;
  source: MotionRect;
  cue: OverlayCue;
  motionBlur?: boolean;
  className?: string;
  style?: CSSProperties;
};
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
/** Where an overlay sits, how opaque it is, and its scale on one frame. */
export type OverlayPose = {
  x: number;
  y: number;
  opacity: number;
  scale: number;
};
/**
 * Resolve travel and fade durations, rejecting cues that cannot include a hold.
 */
export function getOverlayTimings({
  cue,
  theme = MotionSettings.getClassicMotionSettingsTheme(),
}: Readonly<{ cue: OverlayCue; theme?: MotionSettingsTheme }>): OverlayTimings {
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
/**
 * Single-instance overlay with numeric timing, shared presets, easing and
 * travel blur.
 */
export function AnchoredOverlay({
  children,
  frame,
  source,
  cue,
  motionBlur = true,
  className,
  style,
}: Readonly<Props>): ReactNode {
  const theme = MotionSettings.useMotionSettingsTheme();
  const pose = getOverlayPose({ frame, cue, source, theme });
  const prior = getOverlayPose({ frame: frame - 1, cue, source, theme });
  const velocity = Math.hypot(pose.x - prior.x, pose.y - prior.y);
  return (
    <div
      className={className}
      style={{
        ...style,
        position: "absolute",
        left: pose.x,
        top: pose.y,
        width: cue.target.width,
        height: cue.target.height,
        opacity: pose.opacity,
        transform: `scale(${pose.scale})`,
        filter: `${style?.filter ?? ""} blur(${
          motionBlur
            ? MotionSettings.getVelocityBlur({
                distancePerFrame: velocity,
                options: cue.motion,
                maximum: undefined,
                theme,
              })
            : 0
        }px)`,
      }}
    >
      {children}
    </div>
  );
}
