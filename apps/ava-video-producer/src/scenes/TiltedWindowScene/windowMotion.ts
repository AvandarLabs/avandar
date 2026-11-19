import { mix } from "../../motion";
import { getCameraPose } from "../../motion-components/cameraTrack";
import {
  getClassicMotionSettingsTheme,
  type MotionSettingsTheme,
} from "../../motion-components/motionSettings";
import { getSteppedColumnWipeStyle } from "../../storyboard/StoryFilm/steppedColumnWipe";
import {
  getClassicStageMotion,
  getClassicStageTheme,
} from "../stageTheme/stageTheme";
import type { VideoMotion } from "../../videoTheme/createVideoMotion/createVideoMotion";
import type { ResolvedVideoComponents } from "../../videoTheme/videoTheme.types";
import type { Rect } from "../layout/layout";
import type { CSSProperties } from "react";

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

let classicWindowStage: WindowStage | undefined;

/** `classic`'s window stage, the default of every window helper. */
export function getClassicWindowStage(): WindowStage {
  const theme = getClassicStageTheme();
  classicWindowStage ??= {
    motion: getClassicStageMotion(),
    tilt: theme.components.WindowTilt,
    window: theme.components.WindowMotion,
    settings: getClassicMotionSettingsTheme(),
  };
  return classicWindowStage;
}

/** Where a window is relative to its resting box, and how it is turned. */
export type WindowPose = {
  translateX: number;
  translateZ: number;
  rotateY: number;
  opacity: number;
  blurX: number;
};

/** Share of its resting turn a window keeps as it whips off. */
const EXIT_FLATTEN = 0.7;

/** The window at rest in its box, on the theme's tilt. */
export function getRestingPose(
  stage: WindowStage = getClassicWindowStage(),
): WindowPose {
  return {
    translateX: 0,
    translateZ: 0,
    rotateY: stage.tilt.rotateY,
    opacity: 1,
    blurX: 0,
  };
}

/**
 * A window whipping in from beyond the right edge: it decelerates into its
 * box over `durationInFrames` (the sheet duration by default) while its tilt
 * settles from the steeper entry angle.
 */
export function getWhipEntrance(
  frame: number,
  at: number,
  canvas: { width: number },
  box: Rect,
  durationInFrames?: number,
  stage: WindowStage = getClassicWindowStage(),
): WindowPose {
  const { motion, tilt } = stage;
  const progress = motion.ramp(
    frame,
    at,
    durationInFrames ?? motion.sheet,
    motion.entrance.easing,
  );
  return {
    ...getRestingPose(stage),
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
export function getSideEntrance(
  frame: number,
  at: number,
  side: 0 | 1,
  canvas: { width: number },
  box: Rect,
  durationInFrames?: number,
  stage: WindowStage = getClassicWindowStage(),
): WindowPose {
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
    ...getRestingPose(stage),
    translateX: mix(progress, start, 0),
    blurX: mix(progress, stage.window.whipBlur, 0),
  };
}

/** A stepped reveal of a window entering: columns of it rising in turn. */
export type WindowReveal = { columns?: number; durationInFrames: number };

/** Columns a window reveal uses when the plan omits them. */
const REVEAL_COLUMNS = 4;

/**
 * The clip on a window while its stepped reveal runs: columns of the window
 * rise from the bottom, left to right, as a staircase, then the clip is
 * dropped. The same staircase as the `stepped-column-wipe` shot transition,
 * drawn in the window's own plane.
 */
export function getWindowRevealStyle(
  frame: number,
  at: number,
  reveal: WindowReveal | undefined,
  stage: WindowStage = getClassicWindowStage(),
): CSSProperties {
  if (!reveal || frame >= at + reveal.durationInFrames) {
    return {};
  }
  const columns = reveal.columns ?? REVEAL_COLUMNS;
  return getSteppedColumnWipeStyle(
    Math.max(0, frame - at),
    reveal.durationInFrames,
    { columns, staggerFrames: reveal.durationInFrames / (columns + 1) },
    stage.motion,
  );
}

/**
 * A window whipping off past the left edge: it accelerates away on the
 * theme's departure over `durationInFrames`, its tilt flattening slightly,
 * with blur growing as it speeds up. A longer exit keeps the window visible
 * longer, for example when it slides away under a shot transition that
 * covers it.
 */
export function getWhipExit(
  frame: number,
  at: number,
  box: Rect,
  durationInFrames?: number,
  stage: WindowStage = getClassicWindowStage(),
): WindowPose {
  const { motion, tilt } = stage;
  const progress = motion.ramp(
    frame,
    at,
    durationInFrames ?? motion.depart.duration,
    motion.depart.easing,
  );
  return {
    ...getRestingPose(stage),
    translateX: mix(progress, 0, -(box.x + box.width * 1.1)),
    rotateY: mix(progress, tilt.rotateY, tilt.rotateY * EXIT_FLATTEN),
    blurX: mix(progress, 0, stage.window.whipBlur),
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
  windows: readonly CarouselWindow[],
  stage: WindowStage = getClassicWindowStage(),
): { current: number; previous?: number; progress: number } {
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
export function getCarouselPoses(
  progress: number,
  box: Rect,
  stage: WindowStage = getClassicWindowStage(),
): { incoming: WindowPose; outgoing: WindowPose } {
  const { slideBlur, slideHold } = stage.window;
  const resting = getRestingPose(stage);
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

/**
 * The window's rect and how much of its tilt (0 to 1) applies during a
 * pull-back: the full canvas before `atFrame`, its box once landed.
 */
export function getPullBack(
  frame: number,
  enter: PullBack,
  canvas: { width: number; height: number },
  box: Rect,
  stage: WindowStage = getClassicWindowStage(),
): { rect: Rect; tilt: number } {
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
export function getFlipSplit(
  frame: number,
  at: number,
  canvasWidth: number,
  stage: WindowStage = getClassicWindowStage(),
): { rotateY: number; opacity: number; translateX: number; split: number } {
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
 * anchor point on the theme's camera curves, with horizontal blur up to
 * `components.WindowMotion.cameraBlur` while the zoom is changing.
 */
export function getWindowCamera(
  frame: number,
  keys: readonly WindowCameraKey[],
  box: Rect,
  stage: WindowStage = getClassicWindowStage(),
): { scale: number; originX: number; originY: number; blurX: number } {
  const viewport = { width: 1, height: 1 };
  const { settings } = stage;
  const pose = getCameraPose(keys, frame, true, undefined, viewport, settings);
  const before = getCameraPose(
    keys,
    frame - 1,
    true,
    undefined,
    viewport,
    settings,
  );
  const travel = Math.abs(pose.zoom - before.zoom) * box.width;
  return {
    scale: pose.zoom,
    originX: pose.x,
    originY: pose.y,
    blurX: Math.min(stage.window.cameraBlur, travel * 0.5),
  };
}

/**
 * Which headline is on screen and its opacity. Each headline dissolves out
 * over the press duration, ending where the next one starts.
 */
export function getActiveHeadline(
  frame: number,
  headlines: ReadonlyArray<{ atFrame: number }>,
  stage: WindowStage = getClassicWindowStage(),
): { index: number; opacity: number } {
  const index = headlines.reduce((latest, headline, position) => {
    return position > 0 && headline.atFrame <= frame ? position : latest;
  }, 0);
  const next = headlines[index + 1];
  const { motion } = stage;
  const fade = motion.press.duration;
  const opacity = next
    ? 1 -
      motion.ramp(frame, next.atFrame - fade, fade, motion.dissolve.easing)
    : 1;
  return { index, opacity };
}

/** A jump of a tall still inside a window, as a fraction of its height. */
export type ScrollStep = { atFrame: number; offset: number };

/**
 * How far tall window content has scrolled, after quick authored jumps over
 * the press duration.
 */
export function getScrollOffset(
  frame: number,
  steps: readonly ScrollStep[],
  stage: WindowStage = getClassicWindowStage(),
): number {
  const { motion } = stage;
  return steps.reduce((offset, step) => {
    return mix(
      motion.ramp(
        frame,
        step.atFrame,
        motion.press.duration,
        motion.entrance.easing,
      ),
      offset,
      step.offset,
    );
  }, 0);
}
