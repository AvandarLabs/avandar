import { useId } from "react";
import { mix } from "../../motion";
import {
  HorizontalBlurFilter,
  getHorizontalBlurFilter,
} from "../../motion-components/HorizontalBlur";
import { buildColorWithAlpha, elevationToBoxShadow } from "../../videoTheme/cssValueHelpers/cssValueHelpers";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../../videoTheme/useVideoTheme";
import { MediaPlane } from "../MediaPlane";
import { positioned } from "../positioned";
import { useWindowStage } from "./useWindowStage";
import { getScrollOffset, type WindowStage } from "./windowMotion";
import { WINDOW_SHADOW_FALLBACK_ALPHA } from "./windowTilt";
import type { Rect } from "../layout/layout";
import type { WindowSource } from "../scenes.types";
import type { WindowPose } from "./windowMotion";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  rect: Rect;
  pose: WindowPose;
  source: WindowSource;
  canvasHeight: number;
  /** How much of the resting tilt and chrome applies, 0 to 1. Default 1. */
  tilt?: number;
  chrome?: "titlebar" | "none";
  /** Mirrors the tilt for the right-hand window of a pair. Each defaults to
   *  `components.WindowTilt`. */
  rotateX?: number;
  rotateZ?: number;
  perspective?: number;
  /** A clip in the window's own plane, such as a stepped reveal. */
  clipPath?: string;
};

/**
 * One tilted window card holding a still or footage: rounded, shadowed,
 * with an optional titlebar, posed in 3D and blurred along X while it
 * moves. Used by every `TiltedWindowScene` layout. The plane and chrome are
 * `components.WindowTilt`; the shadow is `elevation.window` in the scene's
 * shadow colour, or a mix of its background when the theme sets none.
 */
export function WindowCard({
  frame,
  rect,
  pose,
  source,
  canvasHeight,
  tilt = 1,
  chrome = "titlebar",
  rotateX,
  rotateZ,
  perspective,
  clipPath,
}: Props): ReactNode {
  const filterId = `window-blur-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const stage = useWindowStage();
  const tokens = useVideoTokens();
  const scales = useVideoShapeScales();
  const scene = tokens.color.scene;
  const windowTilt = stage.tilt;
  const shadow = elevationToBoxShadow({
    layers: tokens.elevation.window.layers,
    color:
      scene.shadow ??
      buildColorWithAlpha(scene.background, WINDOW_SHADOW_FALLBACK_ALPHA),
  });
  const titlebar =
    chrome === "titlebar"
      ? canvasHeight * windowTilt.titlebarHeight * tilt
      : 0;
  const transform = [
    `perspective(${perspective ?? windowTilt.perspective}px)`,
    `translateX(${pose.translateX.toFixed(2)}px)`,
    `translateZ(${pose.translateZ.toFixed(2)}px)`,
    `rotateY(${(pose.rotateY * tilt).toFixed(3)}deg)`,
    `rotateX(${((rotateX ?? windowTilt.rotateX) * tilt).toFixed(3)}deg)`,
    `rotateZ(${((rotateZ ?? windowTilt.rotateZ) * tilt).toFixed(3)}deg)`,
  ].join(" ");
  return (
    <>
      <HorizontalBlurFilter id={filterId} amount={pose.blurX} />
      <div
        style={{
          ...positioned(rect),
          transform,
          transformOrigin: "50% 50%",
          opacity: pose.opacity,
          filter: getHorizontalBlurFilter(filterId, pose.blurX),
          borderRadius: scales.corner(windowTilt.chromeRadius) * tilt,
          overflow: "hidden",
          background: scene.background,
          boxShadow: tilt > 0 && !clipPath ? shadow : undefined,
          clipPath,
        }}
      >
        {titlebar > 0 ? (
          <div
            style={{
              height: titlebar,
              background: scene.card,
              borderBottom: `${scales.stroke(tokens.stroke.hairline)}px solid ${scene.border}`,
              opacity: tilt,
            }}
          />
        ) : null}
        <_WindowContent
          frame={frame}
          source={source}
          height={rect.height - titlebar}
          stage={stage}
        />
      </div>
    </>
  );
}

/** The still or footage, fitted to the window or scrolled through. */
function _WindowContent({
  frame,
  source,
  height,
  stage,
}: {
  frame: number;
  source: WindowSource;
  height: number;
  stage: WindowStage;
}) {
  const position = source.objectPosition ?? { x: 0.5, y: 0 };
  const scroll = source.scrollSteps
    ? getScrollOffset(frame, source.scrollSteps, stage)
    : undefined;
  return (
    <div style={{ position: "relative", height, overflow: "hidden" }}>
      <MediaPlane
        frame={frame}
        kind={source.kind}
        src={source.src}
        trimBefore={source.trimBefore}
        alt=""
        style={
          scroll === undefined
            ? {
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: source.fit ?? "cover",
                objectPosition: `${position.x * 100}% ${position.y * 100}%`,
              }
            : {
                display: "block",
                width: "100%",
                height: "auto",
                transform: `translateY(${mix(scroll, 0, -100).toFixed(3)}%)`,
              }
        }
      />
    </div>
  );
}
