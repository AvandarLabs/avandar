import { useId } from "react";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { VideoCssValues } from "../../../videoTheme/VideoCssValues/VideoCssValues";
import {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import { useWindowStage } from "../useWindowStage";
import type { WindowStage } from "../WindowMotion/WindowMotion.types";
import type { Props } from "./WindowCard.types";
import type { WindowCardPlane } from "./WindowCardPlane/WindowCardPlane";
import type { ComponentProps } from "react";

type WindowInput = Props & Required<Pick<Props, "tilt" | "chrome">>;
/** Keeps window identity and theme reads in the original hook order. */
export function useWindowCardState({
  input,
}: Readonly<{ input: WindowInput }>): ComponentProps<typeof WindowCardPlane> {
  const filterId = `window-blur-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const stage = useWindowStage();
  const tokens = useVideoTokens();
  const { atomic } = useVideoTheme();
  const scales = useVideoShapeScales();
  return _makeWindowPlaneFromTheme({
    input,
    filterId,
    stage,
    tokens,
    atomic,
    scales,
  });
}
type WindowPlaneOptions = {
  input: WindowInput;
  filterId: string;
  stage: WindowStage;
  tokens: ReturnType<typeof useVideoTokens>;
  atomic: ReturnType<typeof useVideoTheme>["atomic"];
  scales: ReturnType<typeof useVideoShapeScales>;
};
/** Samples the window plane, titlebar, shadow and perspective transform. */
function _makeWindowPlaneFromTheme({
  input,
  filterId,
  stage,
  tokens,
  atomic,
  scales,
}: Readonly<WindowPlaneOptions>): ComponentProps<typeof WindowCardPlane> {
  const scene = tokens.color.scene;
  const shadow = VideoCssValues.makeBoxShadowFromElevation({
    layers: tokens.elevation.window.layers,
    color:
      tokens.color.scene.shadow ??
      VideoCssValues.makeColorFromAlpha({
        color: scene.background,
        alpha: atomic.opacity["60"],
      }),
  });
  const boxShadow = input.tilt > 0 && !input.clipPath ? shadow : undefined;
  const titlebar =
    input.chrome === "titlebar"
      ? input.canvasHeight * stage.tilt.titlebarHeight * input.tilt
      : 0;
  const transform = [
    `perspective(${input.perspective ?? stage.tilt.perspective}px)`,
    `translateX(${input.pose.translateX.toFixed(2)}px)`,
    `translateZ(${input.pose.translateZ.toFixed(2)}px)`,
    `rotateY(${(input.pose.rotateY * input.tilt).toFixed(3)}deg)`,
    `rotateX(${((input.rotateX ?? stage.tilt.rotateX) * input.tilt).toFixed(3)}deg)`,
    `rotateZ(${((input.rotateZ ?? stage.tilt.rotateZ) * input.tilt).toFixed(3)}deg)`,
  ].join(" ");
  return {
    ...input,
    clipPath: input.clipPath,
    filterId,
    stage,
    tokens,
    scales,
    scene,
    windowTilt: stage.tilt,
    boxShadow,
    titlebar,
    transform,
  };
}
