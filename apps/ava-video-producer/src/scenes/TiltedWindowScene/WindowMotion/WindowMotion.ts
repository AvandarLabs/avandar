import { mix } from "../../../motion";
import { getCameraPose } from "../../../motion-components/cameraTrack/cameraTrack";
import { getSteppedColumnWipeStyle } from "../../../storyboard/StoryFilm/steppedColumnWipe/steppedColumnWipe";
import {
  type WindowStage,
  type WindowPose,
  type GetWhipEntranceOptions,
  type GetSideEntranceOptions,
  type GetWindowRevealStyleOptions,
  type GetWhipExitOptions,
  type CarouselWindow,
  type GetPullBackOptions,
  type GetFlipSplitOptions,
  type GetWindowCameraOptions,
} from "./WindowMotion.types";
import { WindowReadingMotion } from "./WindowReadingMotion";
import type { Rect } from "../../layout/layout";
import type { CSSProperties } from "react";
/** Share of its resting turn a window keeps as it whips off. */
const EXIT_FLATTEN = 0.7;
/**
 * A window whipping in from beyond the right edge: it decelerates into its
 * box over `durationInFrames` (the sheet duration by default) while its tilt
 * settles from the steeper entry angle.
 */
function _getWhipEntrance({
  frame,
  at,
  canvas,
  box,
  durationInFrames,
  stage = WindowReadingMotion.getClassicWindowStage(),
}: Readonly<GetWhipEntranceOptions>): WindowPose {
  const { motion, tilt } = stage;
  const progress = motion.ramp(
    frame,
    at,
    durationInFrames ?? motion.sheet,
    motion.entrance.easing,
  );
  return {
    ...WindowReadingMotion.getRestingPose(stage),
    translateX: mix(progress, canvas.width - box.x + box.width * 0.1, 0),
    rotateY: mix(progress, tilt.entryRotateY, tilt.rotateY),
    blurX: mix(progress, stage.window.whipBlur, 0),
  };
}
/**
 * One window of a pair sliding in from its own outer edge: the left window
 * (`side` 0) from beyond the left edge, the right one from beyond the right
 * edge, decelerating into its box with horizontal blur over
 * `durationInFrames` (the panel duration by default).
 */
function _getSideEntrance({
  frame,
  at,
  side,
  canvas,
  box,
  durationInFrames,
  stage = WindowReadingMotion.getClassicWindowStage(),
}: Readonly<GetSideEntranceOptions>): WindowPose {
  const { motion } = stage;
  const progress = motion.ramp(
    frame,
    at,
    durationInFrames ?? motion.panel,
    motion.entrance.easing,
  );
  const start =
    side === 0
      ? -(box.x + box.width * 1.1)
      : canvas.width - box.x + box.width * 0.1;
  return {
    ...WindowReadingMotion.getRestingPose(stage),
    translateX: mix(progress, start, 0),
    blurX: mix(progress, stage.window.whipBlur, 0),
  };
}
/** Columns a window reveal uses when the plan omits them. */
const REVEAL_COLUMNS = 4;
/**
 * The clip on a window while its stepped reveal runs: columns of the window
 * rise from the bottom, left to right, as a staircase, then the clip is
 * dropped. The same staircase as the `stepped-column-wipe` shot transition,
 * drawn in the window's own plane.
 */
function _getWindowRevealStyle({
  frame,
  at,
  reveal,
  stage = WindowReadingMotion.getClassicWindowStage(),
}: Readonly<GetWindowRevealStyleOptions>): CSSProperties {
  if (!reveal || frame >= at + reveal.durationInFrames) {
    return {};
  }
  const columns = reveal.columns ?? REVEAL_COLUMNS;
  return getSteppedColumnWipeStyle({
    frame: Math.max(0, frame - at),
    durationInFrames: reveal.durationInFrames,
    options: {
      columns,
      staggerFrames: reveal.durationInFrames / (columns + 1),
    },
    motion: stage.motion,
  });
}
/**
 * A window whipping off past the left edge: it accelerates away on the
 * theme's departure over `durationInFrames`, its tilt flattening slightly,
 * with blur growing as it speeds up. A longer exit keeps the window visible
 * longer, for example when it slides away under a shot transition that
 * covers it.
 */
function _getWhipExit({
  frame,
  at,
  box,
  durationInFrames,
  stage = WindowReadingMotion.getClassicWindowStage(),
}: Readonly<GetWhipExitOptions>): WindowPose {
  const { motion, tilt } = stage;
  const progress = motion.ramp(
    frame,
    at,
    durationInFrames ?? motion.depart.duration,
    motion.depart.easing,
  );
  return {
    ...WindowReadingMotion.getRestingPose(stage),
    translateX: mix(progress, 0, -(box.x + box.width * 1.1)),
    rotateY: mix(progress, tilt.rotateY, tilt.rotateY * EXIT_FLATTEN),
    blurX: mix(progress, 0, stage.window.whipBlur),
  };
}
/**
 * Which carousel window is current, the one it is replacing while a slide
 * runs, and the slide's progress (1 when settled or after a cut).
 */
function _getCarouselState({
  frame,
  windows,
  stage = WindowReadingMotion.getClassicWindowStage(),
}: Readonly<{
  frame: number;
  windows: readonly CarouselWindow[];
  stage?: WindowStage;
}>): {
  current: number;
  previous?: number;
  progress: number;
} {
  const current = windows.reduce((latest, window, index) => {
    return index > 0 && (window.atFrame ?? 0) <= frame ? index : latest;
  }, 0);
  const window = windows[current];
  if (current === 0 || window.swap === "cut") {
    return { current, progress: 1 };
  }
  const { motion } = stage;
  const progress = motion.ramp(
    frame,
    window.atFrame ?? 0,
    motion.chip,
    motion.rise.easing,
  );
  return progress < 1
    ? { current, previous: current - 1, progress }
    : { current, progress: 1 };
}
/**
 * The incoming and outgoing poses of one carousel slide: the incoming window
 * slides in on top from the right, the outgoing one slides left, recedes
 * and fades underneath it. The outgoing window only starts fading once the
 * incoming one has covered most of it (the theme's slide hold), so the
 * field never shows through both half-faded windows (a luminance dip on a
 * field much darker or lighter than the window content).
 */
function _getCarouselPoses({
  progress,
  box,
  stage = WindowReadingMotion.getClassicWindowStage(),
}: Readonly<{
  progress: number;
  box: Rect;
  stage?: WindowStage;
}>): {
  incoming: WindowPose;
  outgoing: WindowPose;
} {
  const { slideBlur, slideHold } = stage.window;
  const resting = WindowReadingMotion.getRestingPose(stage);
  return {
    incoming: {
      ...resting,
      translateX: mix(progress, box.width * 0.65, 0),
      opacity: progress,
      blurX: mix(progress, slideBlur, 0),
    },
    outgoing: {
      ...resting,
      translateX: mix(progress, 0, -box.width * 0.28),
      translateZ: mix(progress, 0, -120),
      opacity: 1 - Math.max(0, (progress - slideHold) / (1 - slideHold)),
    },
  };
}
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
      x: mix(progress, 0, box.x),
      y: mix(progress, 0, box.y),
      width: mix(progress, canvas.width, box.width),
      height: mix(progress, canvas.height, box.height),
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
    rotateY: mix(flip, stage.tilt.flipStartRotateY, 0),
    opacity: motion.ramp(frame, at, press, easing),
    translateX: mix(flip, -canvasWidth * 0.3, 0),
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
  const pose = getCameraPose({
    keys,
    frame,
    enabled: true,
    options: undefined,
    viewport,
    theme: settings,
  });
  const before = getCameraPose({
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
/** Samples themed window entrances, exits, reveals, carousels, and cameras. */
export const WindowMotion = {
  /** `classic`'s window stage, the default of every window helper. */
  getClassicWindowStage: WindowReadingMotion.getClassicWindowStage,
  /** The window at rest in its box, on the theme's tilt. */
  getRestingPose: WindowReadingMotion.getRestingPose,
  /**
   * A window whipping in from beyond the right edge: it decelerates into its
   * box over `durationInFrames` (the sheet duration by default) while its
   * tilt
   * settles from the steeper entry angle.
   */
  getWhipEntrance: _getWhipEntrance,
  /**
   * One window of a pair sliding in from its own outer edge: the left window
   * (`side` 0) from beyond the left edge, the right one from beyond the right
   * edge, decelerating into its box with horizontal blur over
   * `durationInFrames` (the panel duration by default).
   */
  getSideEntrance: _getSideEntrance,
  /**
   * The clip on a window while its stepped reveal runs: columns of the window
   * rise from the bottom, left to right, as a staircase, then the clip is
   * dropped. The same staircase as the `stepped-column-wipe` shot transition,
   * drawn in the window's own plane.
   */
  getWindowRevealStyle: _getWindowRevealStyle,
  /**
   * A window whipping off past the left edge: it accelerates away on the
   * theme's departure over `durationInFrames`, its tilt flattening slightly,
   * with blur growing as it speeds up. A longer exit keeps the window visible
   * longer, for example when it slides away under a shot transition that
   * covers it.
   */
  getWhipExit: _getWhipExit,
  /**
   * Which carousel window is current, the one it is replacing while a slide
   * runs, and the slide's progress (1 when settled or after a cut).
   */
  getCarouselState: _getCarouselState,
  /**
   * The incoming and outgoing poses of one carousel slide: the incoming
   * window
   * slides in on top from the right, the outgoing one slides left, recedes
   * and fades underneath it. The outgoing window only starts fading once the
   * incoming one has covered most of it (the theme's slide hold), so the
   * field never shows through both half-faded windows (a luminance dip on a
   * field much darker or lighter than the window content).
   */
  getCarouselPoses: _getCarouselPoses,
  /**
   * The window's rect and how much of its tilt (0 to 1) applies during a
   * pull-back: the full canvas before `atFrame`, its box once landed.
   */
  getPullBack: _getPullBack,
  /**
   * The pair layout's entrance: one joined card flips in on Y from nearly
   * edge-on (`components.WindowTilt.flipStartRotateY`) while travelling in
   * from the left, then splits (0 to 1) into two windows.
   */
  getFlipSplit: _getFlipSplit,
  /**
   * A camera on the window layer only: the window scales by `zoom` about its
   * anchor point on the theme's camera curves, with horizontal blur up to
   * `components.WindowMotion.cameraBlur` while the zoom is changing.
   */
  getWindowCamera: _getWindowCamera,
  /**
   * Which headline is on screen and its opacity. Each headline dissolves out
   * over the press duration, ending where the next one starts.
   */
  getActiveHeadline: WindowReadingMotion.getActiveHeadline,
  /**
   * How far tall window content has scrolled, after quick authored jumps over
   * the press duration.
   */
  getScrollOffset: WindowReadingMotion.getScrollOffset,
};
