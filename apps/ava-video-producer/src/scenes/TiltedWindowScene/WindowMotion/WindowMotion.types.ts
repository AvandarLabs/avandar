import { type MotionSettingsTheme } from "../../../motion-components/MotionSettings/MotionSettings";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { ResolvedVideoComponents } from "../../../videoTheme/videoTheme.types";
import type { Rect } from "../../layout/layout";
/** Inputs for sampling a window's blurred entrance from the right. */
export type GetWhipEntranceOptions = {
  frame: number;
  at: number;
  canvas: { width: number };
  box: Rect;
  durationInFrames?: number;
  stage?: WindowStage;
};
/** Inputs for sliding either window of a pair in from its outer edge. */
export type GetSideEntranceOptions = {
  frame: number;
  at: number;
  side: 0 | 1;
  canvas: { width: number };
  box: Rect;
  durationInFrames?: number;
  stage?: WindowStage;
};
/** Inputs for clipping an entering window with staggered columns. */
export type GetWindowRevealStyleOptions = {
  frame: number;
  at: number;
  reveal: WindowReveal | undefined;
  stage?: WindowStage;
};
/** Inputs for sampling a window's blurred exit past the left edge. */
export type GetWhipExitOptions = {
  frame: number;
  at: number;
  box: Rect;
  durationInFrames?: number;
  stage?: WindowStage;
};
/** Inputs for shrinking full-canvas footage into its tilted window box. */
export type GetPullBackOptions = {
  frame: number;
  enter: PullBack;
  canvas: { width: number; height: number };
  box: Rect;
  stage?: WindowStage;
};
/** Inputs for flipping one joined card into a pair of windows. */
export type GetFlipSplitOptions = {
  frame: number;
  at: number;
  canvasWidth: number;
  stage?: WindowStage;
};
/** Inputs for sampling anchored zoom and blur on the window layer. */
export type GetWindowCameraOptions = {
  frame: number;
  keys: readonly WindowCameraKey[];
  box: Rect;
  stage?: WindowStage;
};
/**
 * The theme values a tilted window moves with: the motion vocabulary, its
 * plane (`components.WindowTilt`), its blur and slide hold
 * (`components.WindowMotion`), and the camera curves its push-ins use.
 */
export type WindowStage = Readonly<{
  motion: VideoMotion;
  tilt: ResolvedVideoComponents["WindowTilt"];
  window: ResolvedVideoComponents["WindowMotion"];
  settings: MotionSettingsTheme;
}>;
/** Where a window is relative to its resting box, and how it is turned. */
export type WindowPose = {
  translateX: number;
  translateZ: number;
  rotateY: number;
  opacity: number;
  blurX: number;
};
/** A stepped reveal of a window entering: columns of it rising in turn. */
export type WindowReveal = { columns?: number; durationInFrames: number };
/** One window of a carousel. The first window has no `atFrame`. */
export type CarouselWindow = { atFrame?: number; swap?: "slide" | "cut" };
/** A window that opens as full-bleed footage and pulls back into its box. */
export type PullBack = {
  kind: "pull-back";
  atFrame: number;
  durationInFrames?: number;
  /**
   * `word` (default) lands fast and settles; `inOut` starts gently, which
   * keeps a bright full-bleed still from dimming the frame in one step when
   * it shrinks onto a dark field.
   */
  ease?: "word" | "inOut";
};
/** One stop of a window camera: anchor `x`,`y` in 0..1 of the window. */
export type WindowCameraKey = {
  at: number;
  x: number;
  y: number;
  zoom: number;
  ease?: "glide" | "push" | "whip";
};
/** A jump of a tall still inside a window, as a fraction of its height. */
export type ScrollStep = { atFrame: number; offset: number };
