import { Motion } from "../../../motion";
import { SteppedColumnWipe } from "../../../storyboard/StoryFilm/SteppedColumnWipe/SteppedColumnWipe";
import { WindowReadingMotion } from "./WindowReadingMotion";
import type {
  WindowPose,
  GetWhipEntranceOptions,
  GetSideEntranceOptions,
  GetWindowRevealStyleOptions,
  GetWhipExitOptions,
} from "./WindowMotion.types";
import type { CSSProperties } from "react";

/** Share of resting turn retained on exit. */
const EXIT_FLATTEN = 0.7;
/** Default number of stepped reveal columns. */
const REVEAL_COLUMNS = 4;
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
    translateX: Motion.mix({
      t: progress,
      from: canvas.width - box.x + box.width * 0.1,
      to: 0,
    }),
    rotateY: Motion.mix({
      t: progress,
      from: tilt.entryRotateY,
      to: tilt.rotateY,
    }),
    blurX: Motion.mix({
      t: progress,
      from: stage.window.whipBlur,
      to: 0,
    }),
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
    translateX: Motion.mix({
      t: progress,
      from: start,
      to: 0,
    }),
    blurX: Motion.mix({
      t: progress,
      from: stage.window.whipBlur,
      to: 0,
    }),
  };
}
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
  return SteppedColumnWipe.getSteppedColumnWipeStyle({
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
    translateX: Motion.mix({
      t: progress,
      from: 0,
      to: -(box.x + box.width * 1.1),
    }),
    rotateY: Motion.mix({
      t: progress,
      from: tilt.rotateY,
      to: tilt.rotateY * EXIT_FLATTEN,
    }),
    blurX: Motion.mix({
      t: progress,
      from: 0,
      to: stage.window.whipBlur,
    }),
  };
}
/** Samples a cohesive group of themed window poses. */
export const WindowEntranceMotion = {
  /** Samples the WhipEntrance motion. */
  getWhipEntrance: _getWhipEntrance,
  /** Samples the SideEntrance motion. */
  getSideEntrance: _getSideEntrance,
  /** Samples the WindowRevealStyle motion. */
  getWindowRevealStyle: _getWindowRevealStyle,
  /** Samples the WhipExit motion. */
  getWhipExit: _getWhipExit,
};
