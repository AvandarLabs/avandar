import { getOverlayPose } from "./getOverlayPose";
import { MotionRect, OverlayCue } from "./getOverlayTimings";
import { MotionSettings } from "./MotionSettings/MotionSettings";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  frame: number;
  source: MotionRect;
  cue: OverlayCue;
  motionBlur?: boolean;
  className?: string;
  style?: CSSProperties;
};
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
