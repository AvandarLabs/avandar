import { useId } from "react";
import {
  HorizontalBlurFilter,
  getHorizontalBlurFilter,
} from "../../../../motion-components/HorizontalBlur";
import { useWindowStage } from "../../../../scenes/TiltedWindowScene/useWindowStage";
import { WINDOW_SHADOW_FALLBACK_ALPHA } from "../../../../scenes/TiltedWindowScene/windowTilt";
import {
  buildColorWithAlpha,
  elevationToBoxShadow,
} from "../../../../videoTheme/cssValueHelpers/cssValueHelpers";
import { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../../../../videoTheme/useVideoTheme";
import { DemoWindow } from "./DemoWindow";
import css from "./parts.module.css";
import type { WindowPose } from "../../../../scenes/TiltedWindowScene/windowMotion";
import type { ResolvedVideoComponents } from "../../../../videoTheme/videoTheme.types";
import type { CSSProperties, ReactNode } from "react";

type Rect = { x: number; y: number; width: number; height: number };

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

/**
 * The 3D transform of a posed window, as the tilted window scene builds it,
 * with the theme's `WindowTilt` plane where the props leave it unset.
 */
function _buildTiltTransform(
  {
    pose,
    tilt = 1,
    perspective = windowTilt.perspective,
    rotateX = windowTilt.rotateX,
    rotateZ = windowTilt.rotateZ,
  }: Props,
  windowTilt: ResolvedVideoComponents["WindowTilt"],
): string {
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
 * way the tilted window scene composes its own window card: the theme's
 * tilt, chrome corner, and window shadow.
 */
export function TiltedDemoWindow(props: Props): ReactNode {
  const { box, pose, variant, label, contentStyle } = props;
  const filterId = `demo-blur-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { tilt } = useWindowStage();
  const tokens = useVideoTokens();
  const scales = useVideoShapeScales();
  const scene = tokens.color.scene;
  const transform = _buildTiltTransform(props, tilt);
  const shadow = elevationToBoxShadow({
    layers: tokens.elevation.window.layers,
    color:
      scene.shadow ??
      buildColorWithAlpha(scene.background, WINDOW_SHADOW_FALLBACK_ALPHA),
  });
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
            borderRadius: scales.corner(tilt.chromeRadius),
            boxShadow: shadow,
          }}
        >
          <DemoWindow variant={variant} label={label} />
        </div>
      </div>
    </>
  );
}
