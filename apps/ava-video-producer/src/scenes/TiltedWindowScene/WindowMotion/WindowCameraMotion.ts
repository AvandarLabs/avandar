import { Motion } from "../../../motion";
import { CameraTrack } from "../../../motion-components/CameraTrack/CameraTrack";
import { WindowReadingMotion } from "./WindowReadingMotion";
import type { Rect } from "../../layout/SceneGeometry";
import type {
  GetPullBackOptions,
  GetFlipSplitOptions,
  GetWindowCameraOptions,
} from "./WindowMotion.types";

/**
 * The window's rect and how much of its tilt (0 to 1) applies during a
 * pull-back: the full canvas before `atFrame`, its box once landed.
 */
function _getPullBack({
  frame,
  enter,
  canvas,
  box,
  stage = WindowReadingMotion.getClassicWindowStage(),
}: Readonly<GetPullBackOptions>): {
  rect: Rect;
  tilt: number;
} {
  const { motion } = stage;
  const progress = motion.ramp(
    frame,
    enter.atFrame,
    enter.durationInFrames ?? motion.hero,
    enter.ease === "inOut" ? motion.travel.easing : motion.rise.easing,
  );
  return {
    rect: {
      x: Motion.mix({
        t: progress,
        from: 0,
        to: box.x,
      }),
      y: Motion.mix({
        t: progress,
        from: 0,
        to: box.y,
      }),
      width: Motion.mix({
        t: progress,
        from: canvas.width,
        to: box.width,
      }),
      height: Motion.mix({
        t: progress,
        from: canvas.height,
        to: box.height,
      }),
    },
    tilt: progress,
  };
}
/**
 * The pair layout's entrance: one joined card flips in on Y from nearly
 * edge-on (`components.WindowTilt.flipStartRotateY`) while travelling in
 * from the left, then splits (0 to 1) into two windows.
 */
function _getFlipSplit({
  frame,
  at,
  canvasWidth,
  stage = WindowReadingMotion.getClassicWindowStage(),
}: Readonly<GetFlipSplitOptions>): {
  rotateY: number;
  opacity: number;
  translateX: number;
  split: number;
} {
  const { motion } = stage;
  const easing = motion.entrance.easing;
  const press = motion.press.duration;
  const flip = motion.ramp(frame, at, motion.whip, easing);
  return {
    // Not quite edge-on: at 90 degrees the near edge would pass the camera.
    rotateY: Motion.mix({
      t: flip,
      from: stage.tilt.flipStartRotateY,
      to: 0,
    }),
    opacity: motion.ramp(frame, at, press, easing),
    translateX: Motion.mix({
      t: flip,
      from: -canvasWidth * 0.3,
      to: 0,
    }),
    split: motion.ramp(frame, at + motion.panel + press - 1, press, easing),
  };
}
/**
 * A camera on the window layer only: the window scales by `zoom` about its
 * anchor point on the theme's camera curves, with horizontal blur up to
 * `components.WindowMotion.cameraBlur` while the zoom is changing.
 */
function _getWindowCamera({
  frame,
  keys,
  box,
  stage = WindowReadingMotion.getClassicWindowStage(),
}: Readonly<GetWindowCameraOptions>): {
  scale: number;
  originX: number;
  originY: number;
  blurX: number;
} {
  const viewport = { width: 1, height: 1 };
  const { settings } = stage;
  const pose = CameraTrack.getPose({
    keys,
    frame,
    enabled: true,
    options: undefined,
    viewport,
    theme: settings,
  });
  const before = CameraTrack.getPose({
    keys,
    frame: frame - 1,
    enabled: true,
    options: undefined,
    viewport,
    theme: settings,
  });
  const travel = Math.abs(pose.zoom - before.zoom) * box.width;
  return {
    scale: pose.zoom,
    originX: pose.x,
    originY: pose.y,
    blurX: Math.min(stage.window.cameraBlur, travel * 0.5),
  };
}
/** Samples a cohesive group of themed window poses. */
export const WindowCameraMotion = {
  /** Samples the PullBack motion. */
  getPullBack: _getPullBack,
  /** Samples the FlipSplit motion. */
  getFlipSplit: _getFlipSplit,
  /** Samples the WindowCamera motion. */
  getWindowCamera: _getWindowCamera,
};
