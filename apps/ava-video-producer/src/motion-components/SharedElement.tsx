import { interpolateStyles } from "@remotion/animation-utils";
import { getMotionProgress } from "./motionSettings";
import type { MotionRect } from "./AnchoredOverlay";
import type { MotionOptions } from "./motionSettings";
import type { CSSProperties, ReactNode } from "react";

/** A persistent child's source, destination and frame-authored travel controls. */
export type SharedElementProps = {
  source: MotionRect;
  target: MotionRect;
  frame: number;
  at: number;
  durationInFrames: number;
  motion?: MotionOptions;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** Keep one semantic object mounted as its measured rectangle changes. */
export function SharedElement({
  source,
  target,
  frame,
  at,
  durationInFrames,
  motion,
  children,
  className,
  style,
}: SharedElementProps) {
  const progress = getMotionProgress(frame, at, durationInFrames, motion);
  const geometry = interpolateStyles(
    progress,
    [0, 1],
    [
      {
        left: source.x,
        top: source.y,
        width: source.width,
        height: source.height,
      },
      {
        left: target.x,
        top: target.y,
        width: target.width,
        height: target.height,
      },
    ],
  );
  return (
    <div
      className={className}
      style={{ ...style, ...geometry, position: "absolute" }}
    >
      {children}
    </div>
  );
}
