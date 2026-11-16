import { useId } from "react";
import {
  HorizontalBlurFilter,
  getHorizontalBlurFilter,
} from "../../../../motion-components/HorizontalBlur";
import {
  WINDOW_CHROME,
  WINDOW_SHADOW,
  WINDOW_TILT,
} from "../../../../scenes/TiltedWindowScene/windowTilt";
import { DemoWindow } from "./DemoWindow";
import css from "./parts.module.css";
import type { WindowPose } from "../../../../scenes/TiltedWindowScene/windowMotion";
import type { CSSProperties } from "react";

type Rect = { x: number; y: number; width: number; height: number };

/** A window at rest in its box, in the tilted plane. */
export const RESTING_WINDOW_POSE: WindowPose = {
  translateX: 0,
  translateZ: 0,
  rotateY: WINDOW_TILT.rotateY,
  opacity: 1,
  blurX: 0,
};

type Props = {
  box: Rect;
  pose: WindowPose;
  /** Share of the resting tilt applied, 0 (flat) to 1. */
  tilt?: number;
  perspective?: number;
  rotateX?: number;
  rotateZ?: number;
  variant?: 0 | 1 | 2;
  label?: string;
  /** Frame-driven style on the window itself, for example a reveal clip. */
  contentStyle?: CSSProperties;
};

/** The 3D transform of a posed window, as the tilted window scene builds it. */
function _buildTiltTransform({
  pose,
  tilt = 1,
  perspective = WINDOW_TILT.perspective,
  rotateX = WINDOW_TILT.rotateX,
  rotateZ = WINDOW_TILT.rotateZ,
}: Props): string {
  return [
    `perspective(${perspective}px)`,
    `translateX(${pose.translateX.toFixed(2)}px)`,
    `translateZ(${pose.translateZ.toFixed(2)}px)`,
    `rotateY(${(pose.rotateY * tilt).toFixed(3)}deg)`,
    `rotateX(${(rotateX * tilt).toFixed(3)}deg)`,
    `rotateZ(${(rotateZ * tilt).toFixed(3)}deg)`,
  ].join(" ");
}

/**
 * A window placed in its box and posed in the tilted plane, composed the
 * way the tilted window scene composes its own window card.
 */
export function TiltedDemoWindow(props: Props) {
  const { box, pose, variant, label, contentStyle } = props;
  const filterId = `demo-blur-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const transform = _buildTiltTransform(props);
  return (
    <>
      <HorizontalBlurFilter id={filterId} amount={pose.blurX} />
      <div
        className={css.tilted}
        style={{
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
          opacity: pose.opacity,
          transform,
          filter: getHorizontalBlurFilter(filterId, pose.blurX),
        }}
      >
        <div
          className={css.tiltedContent}
          style={{
            ...contentStyle,
            borderRadius: WINDOW_CHROME.radius,
            boxShadow: WINDOW_SHADOW,
          }}
        >
          <DemoWindow variant={variant} label={label} />
        </div>
      </div>
    </>
  );
}
