import type { Rect } from "../../layout/SceneGeometry";
import type { WindowSource } from "../../scenes.types";
import type {
  WindowStage,
  WindowPose,
} from "../WindowMotion/WindowMotion.types";

export type WindowContentOptions = {
  frame: number;
  source: WindowSource;
  height: number;
  stage: WindowStage;
};
export type Props = {
  frame: number;
  rect: Rect;
  pose: WindowPose;
  source: WindowSource;
  canvasHeight: number;
  /** How much of the resting tilt and chrome applies, 0 to 1. Default 1. */
  tilt?: number;
  chrome?: "titlebar" | "none";
  /**
   * Mirrors the tilt for the right-hand window of a pair. Each defaults to
   * `components.WindowTilt`.
   */
  rotateX?: number;
  rotateZ?: number;
  perspective?: number;
  /** A clip in the window's own plane, such as a stepped reveal. */
  clipPath?: string;
};
