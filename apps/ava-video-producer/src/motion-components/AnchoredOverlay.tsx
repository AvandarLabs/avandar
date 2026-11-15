import { mix, ramp } from "../motion";
import {
  getMotionDuration,
  getMotionProgress,
  getVelocityBlur,
} from "./motionSettings";
import type { MotionOptions } from "./motionSettings";
import type { CSSProperties, ReactNode } from "react";

/** Measured geometry in the enclosing composition's coordinate system. */
export type MotionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
/** A complete trip with a stationary reading interval and a return to its source. */
export type OverlayCue = {
  at: number;
  until: number;
  target: MotionRect;
  entryFrames?: number;
  exitFrames?: number;
  fadeFrames?: number;
  motion?: MotionOptions;
};

/** Resolve travel and fade durations, rejecting cues that cannot include a hold. */
export function getOverlayTimings(cue: OverlayCue) {
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

/** Floating artwork originates at a measured region without moving the source UI. */
export function getOverlayPose(
  frame: number,
  cue: OverlayCue,
  source: MotionRect,
) {
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

/** Single-instance overlay with numeric timing, shared presets, easing and travel blur. */
export function AnchoredOverlay({
  children,
  frame,
  source,
  cue,
  motionBlur = true,
  className,
  style,
}: {
  children: ReactNode;
  frame: number;
  source: MotionRect;
  cue: OverlayCue;
  motionBlur?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const pose = getOverlayPose(frame, cue, source);
  const prior = getOverlayPose(frame - 1, cue, source);
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
        filter: `${style?.filter ?? ""} blur(${motionBlur ? getVelocityBlur(velocity, cue.motion) : 0}px)`,
      }}
    >
      {children}
    </div>
  );
}
