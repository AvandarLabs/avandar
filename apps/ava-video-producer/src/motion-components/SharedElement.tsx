import { interpolateStyles } from "@remotion/animation-utils";
import { getMotionProgress, useMotionSettingsTheme } from "./motionSettings";
import type { MotionRect } from "./AnchoredOverlay";
import type { MotionOptions } from "./motionSettings";
import type { CSSProperties, ReactNode } from "react";

/**
 * A persistent child's source, destination and frame-authored travel controls.
 */
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

function _rectToGeometry(rect: MotionRect) {
  return {
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

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
}: SharedElementProps): ReactNode {
  const theme = useMotionSettingsTheme();
  const progress = getMotionProgress(
    frame,
    at,
    durationInFrames,
    motion,
    undefined,
    theme,
  );
  const geometry = interpolateStyles(
    progress,
    [0, 1],
    [_rectToGeometry(source), _rectToGeometry(target)],
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
