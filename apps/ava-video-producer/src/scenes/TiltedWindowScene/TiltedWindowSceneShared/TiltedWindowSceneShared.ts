import { WindowMotion } from "../WindowMotion/WindowMotion";
import {
  type WindowStage,
  type WindowPose,
} from "../WindowMotion/WindowMotion.types";
import type { Rect } from "../../layout/SceneGeometry";
import type { TiltedWindowSceneProps } from "../../scenes.types";
import type { CSSProperties } from "react";

type ToPixelsOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
};
/** The clip a whip entrance reveals the window through, if it has one. */
function _getWhipRevealClipPath({
  props,
  stage,
}: Readonly<{
  props: Pick<TiltedWindowSceneProps, "frame" | "enter">;
  stage: WindowStage;
}>): string | undefined {
  return props.enter?.kind === "whip"
    ? WindowMotion.getWindowRevealStyle({
        frame: props.frame,
        at: props.enter.atFrame ?? 1,
        reveal: props.enter.reveal,
        stage,
      }).clipPath
    : undefined;
}
/** The full-frame layer the camera scales about its origin in the window. */
function _buildLensStyle({
  lens,
  box,
}: Readonly<{
  lens: ReturnType<typeof WindowMotion.getWindowCamera> | undefined;
  box: Rect;
}>): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    transformOrigin: lens
      ? `${box.x + lens.originX * box.width}px ${box.y + lens.originY * box.height}px`
      : undefined,
    transform:
      lens && lens.scale !== 1 ? `scale(${lens.scale.toFixed(4)})` : undefined,
  };
}
/** The whole window's entrance or exit pose at this frame. */
function _getBasePose({
  props,
  box,
  stage,
}: Readonly<{
  props: Pick<TiltedWindowSceneProps, "frame" | "enter" | "exit"> & {
    width: number;
  };
  box: Rect;
  stage: WindowStage;
}>): WindowPose {
  const { frame, exit, enter } = props;
  if (exit && frame >= exit.atFrame) {
    return WindowMotion.getWhipExit({
      frame,
      at: exit.atFrame,
      box,
      durationInFrames: exit.durationInFrames,
      stage,
    });
  }
  return enter === undefined || enter.kind === "whip"
    ? WindowMotion.getWhipEntrance({
        frame,
        at: enter?.atFrame ?? 1,
        canvas: { width: props.width },
        box,
        durationInFrames: enter?.durationInFrames,
        stage,
      })
    : WindowMotion.getRestingPose(stage);
}
/** Layers a carousel slide over the whole window's entrance or exit. */
function _combinePoses({
  base,
  slide,
  cameraBlur,
}: Readonly<{
  base: WindowPose;
  slide: WindowPose;
  cameraBlur: number;
}>): WindowPose {
  return {
    translateX: base.translateX + slide.translateX,
    translateZ: base.translateZ + slide.translateZ,
    rotateY: base.rotateY,
    opacity: base.opacity * slide.opacity,
    blurX: Math.max(base.blurX, slide.blurX, cameraBlur),
  };
}
function _toPixels({
  box,
  canvas,
}: Readonly<{
  box: ToPixelsOptions;
  canvas: {
    width: number;
    height: number;
  };
}>): Rect {
  return {
    x: box.x * canvas.width,
    y: box.y * canvas.height,
    width: box.width * canvas.width,
    height: box.height * canvas.height,
  };
}
/** Combines window poses, reveal clips, and camera styles in canvas pixels. */
export const TiltedWindowSceneShared = {
  /** Converts a fractional window box to canvas pixel coordinates. */
  toPixels: _toPixels,
  /** The whole window's entrance or exit pose at this frame. */
  getBasePose: _getBasePose,
  /** Layers a carousel slide over the whole window's entrance or exit. */
  combinePoses: _combinePoses,
  /** The clip a whip entrance reveals the window through, if it has one. */
  getWhipRevealClipPath: _getWhipRevealClipPath,
  /** The full-frame layer the camera scales about its origin in the window. */
  buildLensStyle: _buildLensStyle,
} as const;
