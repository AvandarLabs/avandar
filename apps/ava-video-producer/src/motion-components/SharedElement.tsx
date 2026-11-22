import { interpolateStyles } from "@remotion/animation-utils";
import type { MotionRect } from "./getOverlayTimings";
import { MotionSettings } from "./MotionSettings/MotionSettings";
import type { MotionOptions } from "./MotionSettings/MotionSettings";
import type { CSSProperties, ReactNode } from "react";
/**
 * A persistent child's source, destination and frame-authored travel controls.
 */
export type Props = {
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
  return { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
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
}: Props): ReactNode {
  const theme = MotionSettings.useMotionSettingsTheme();
  const progress = MotionSettings.getMotionProgress({
    frame,
    at,
    duration: durationInFrames,
    options: motion,
    fallback: undefined,
    theme,
  });
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
/** The public input contract for shared-element motion. */
export type SharedElementProps = Props;
