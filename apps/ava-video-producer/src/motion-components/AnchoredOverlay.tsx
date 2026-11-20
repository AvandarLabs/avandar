import { getOverlayPose } from "./getOverlayPose";
import { getVelocityBlur } from "./motionSettings";
import type { MotionRect, OverlayCue } from "./getOverlayTimings";
import type { CSSProperties, ReactNode } from "react";

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
}: {
  children: ReactNode;
  frame: number;
  source: MotionRect;
  cue: OverlayCue;
  motionBlur?: boolean;
  className?: string;
  style?: CSSProperties;
}): ReactNode {
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
