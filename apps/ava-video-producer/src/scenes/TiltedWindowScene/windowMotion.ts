import { DUR, EASE, mix, ramp } from "../../motion";
import { getCameraPose } from "../../motion-components/cameraTrack";
import { WINDOW_TILT } from "./windowTilt";
import type { Rect } from "../layout/layout";

/** Where a window is relative to its resting box, and how it is turned. */
export type WindowPose = {
  translateX: number;
  translateZ: number;
  rotateY: number;
  opacity: number;
  blurX: number;
};

/** Peak horizontal blur of a window whipping in or out, in pixels. */
const WHIP_BLUR = 40;
/** Peak horizontal blur of a carousel slide, in pixels. */
const SLIDE_BLUR = 25;
/** Most blur a camera move adds to the window, in pixels. */
const CAMERA_BLUR = 12;

const RESTING_POSE: WindowPose = {
  translateX: 0,
  translateZ: 0,
  rotateY: WINDOW_TILT.rotateY,
  opacity: 1,
  blurX: 0,
};

/**
 * A window whipping in from beyond the right edge: it decelerates into its
 * box while its tilt settles from the steeper entry angle.
 */
export function getWhipEntrance(
  frame: number,
  at: number,
  canvas: { width: number },
  box: Rect,
): WindowPose {
  const progress = ramp(frame, at, DUR.sheet, EASE.out);
  return {
    ...RESTING_POSE,
    translateX: mix(progress, canvas.width - box.x + box.width * 0.1, 0),
    rotateY: mix(progress, WINDOW_TILT.entryRotateY, WINDOW_TILT.rotateY),
    blurX: mix(progress, WHIP_BLUR, 0),
  };
}

/**
 * A window whipping off past the left edge: it accelerates away, its tilt
 * flattening slightly, with blur growing as it speeds up.
 */
export function getWhipExit(frame: number, at: number, box: Rect): WindowPose {
  const progress = ramp(frame, at, DUR.whip, EASE.in);
  return {
    ...RESTING_POSE,
    translateX: mix(progress, 0, -(box.x + box.width * 1.1)),
    rotateY: mix(progress, WINDOW_TILT.rotateY, WINDOW_TILT.rotateY * 0.7),
    blurX: mix(progress, 0, WHIP_BLUR),
  };
}

/** One window of a carousel. The first window has no `atFrame`. */
export type CarouselWindow = { atFrame?: number; swap?: "slide" | "cut" };

/**
 * Which carousel window is current, the one it is replacing while a slide
 * runs, and the slide's progress (1 when settled or after a cut).
 */
export function getCarouselState(
  frame: number,
  windows: ReadonlyArray<CarouselWindow>,
): { current: number; previous?: number; progress: number } {
  const current = windows.reduce(
    (latest, window, index) =>
      index > 0 && (window.atFrame ?? 0) <= frame ? index : latest,
    0,
  );
  const window = windows[current];
  if (current === 0 || window.swap === "cut") {
    return { current, progress: 1 };
  }
  const progress = ramp(frame, window.atFrame ?? 0, DUR.chip, EASE.word);
  return progress < 1
    ? { current, previous: current - 1, progress }
    : { current, progress: 1 };
}

/**
 * The incoming and outgoing poses of one carousel slide: the incoming window
 * slides in on top from the right, the outgoing one slides left, recedes
 * and fades underneath it.
 */
export function getCarouselPoses(progress: number, box: Rect) {
  return {
    incoming: {
      ...RESTING_POSE,
      translateX: mix(progress, box.width * 0.65, 0),
      opacity: progress,
      blurX: mix(progress, SLIDE_BLUR, 0),
    },
    outgoing: {
      ...RESTING_POSE,
      translateX: mix(progress, 0, -box.width * 0.28),
      translateZ: mix(progress, 0, -120),
      opacity: 1 - progress,
    },
  };
}

/** A window that opens as full-bleed footage and pulls back into its box. */
export type PullBack = {
  kind: "pull-back";
  atFrame: number;
  durationInFrames?: number;
};

/**
 * The window's rect and how much of its tilt (0 to 1) applies during a
 * pull-back: the full canvas before `atFrame`, its box once landed.
 */
export function getPullBack(
  frame: number,
  enter: PullBack,
  canvas: { width: number; height: number },
  box: Rect,
): { rect: Rect; tilt: number } {
  const progress = ramp(
    frame,
    enter.atFrame,
    enter.durationInFrames ?? DUR.hero,
    EASE.word,
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
 * The pair layout's entrance: one joined card flips in on Y from edge-on
 * while travelling in from the left, then splits (0 to 1) into two windows.
 */
export function getFlipSplit(frame: number, at: number, canvasWidth: number) {
  const flip = ramp(frame, at, DUR.whip, EASE.out);
  return {
    rotateY: mix(flip, 90, 0),
    translateX: mix(flip, -canvasWidth * 0.3, 0),
    split: ramp(frame, at + DUR.panel + DUR.press - 1, DUR.press, EASE.out),
  };
}

/** One stop of a window camera: anchor `x`,`y` in 0..1 of the window. */
export type WindowCameraKey = {
  at: number;
  x: number;
  y: number;
  zoom: number;
  ease?: "glide" | "push" | "whip";
};

/**
 * A camera on the window layer only: the window scales by `zoom` about its
 * anchor point, with horizontal blur while the zoom is changing.
 */
export function getWindowCamera(
  frame: number,
  keys: ReadonlyArray<WindowCameraKey>,
  box: Rect,
): { scale: number; originX: number; originY: number; blurX: number } {
  const viewport = { width: 1, height: 1 };
  const pose = getCameraPose(keys, frame, true, undefined, viewport);
  const before = getCameraPose(keys, frame - 1, true, undefined, viewport);
  const travel = Math.abs(pose.zoom - before.zoom) * box.width;
  return {
    scale: pose.zoom,
    originX: pose.x,
    originY: pose.y,
    blurX: Math.min(CAMERA_BLUR, travel * 0.5),
  };
}

/**
 * Which headline is on screen and its opacity. Each headline fades out over
 * `DUR.press` frames ending where the next one starts.
 */
export function getActiveHeadline(
  frame: number,
  headlines: ReadonlyArray<{ atFrame: number }>,
): { index: number; opacity: number } {
  const index = headlines.reduce(
    (latest, headline, position) =>
      position > 0 && headline.atFrame <= frame ? position : latest,
    0,
  );
  const next = headlines[index + 1];
  const opacity = next
    ? 1 - ramp(frame, next.atFrame - DUR.press, DUR.press, EASE.inOut)
    : 1;
  return { index, opacity };
}

/** A jump of a tall still inside a window, as a fraction of its height. */
export type ScrollStep = { atFrame: number; offset: number };

/** How far tall window content has scrolled, after quick authored jumps. */
export function getScrollOffset(
  frame: number,
  steps: ReadonlyArray<ScrollStep>,
): number {
  return steps.reduce(
    (offset, step) =>
      mix(ramp(frame, step.atFrame, DUR.press, EASE.out), offset, step.offset),
    0,
  );
}
