import { Motion } from "../../motion";
import { StageTheme } from "../StageTheme/StageTheme";
import type { VideoMotion } from "../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { CSSProperties } from "react";

type GetLineRevealStyleOptions = {
  frame: number;
  at: number;
  mode: Exclude<TextRevealMode, "word-mask">;
  options?: {
    rise?: number;
  };
  motion?: VideoMotion;
};
type GetWipeExitStyleOptions = {
  frame: number;
  at: number;
  durationInFrames: number;
  motion?: VideoMotion;
};
type GetStagedExitStyleOptions = {
  frame: number;
  exit: StagedExit | undefined;
  orderIndex: number;
  motion?: VideoMotion;
};
/**
 * How a block of text arrives. `word-mask` (each word rising through its own
 * mask) is drawn word by word by the scene itself; the others apply to a
 * whole line or label through `getLineRevealStyle`.
 */
export type TextRevealMode = "word-mask" | "line-fade" | "wipe" | "cut";
/** How far a wiped line travels sideways while it is revealed, in percent. */
const WIPE_TRAVEL_PERCENT = -8;
/** How far a scene title rises as it arrives, in pixels. */
const TITLE_RISE = 10;
/** How far a scene kicker rises as it arrives, in pixels. */
const KICKER_RISE = 8;
/**
 * The style of one line, label or icon arriving at frame `at`, shared by
 * scenes that stage text line by line, for example a headline beside a
 * window or a wordmark beside a logo. `line-fade` fades with a small rise
 * (`rise` pixels, 0 for a pure fade; the entrance distance by default),
 * `wipe` reveals left to right behind a clip, and `cut` appears on its
 * frame. Both ease on the theme's `motion.rise` curve.
 */
function _getLineRevealStyle({
  frame,
  at,
  mode,
  options = {},
  motion = StageTheme.getClassicStageMotion(),
}: Readonly<GetLineRevealStyleOptions>): CSSProperties {
  if (mode === "cut") {
    return { opacity: frame >= at ? 1 : 0 };
  }
  if (mode === "line-fade") {
    return motion.enter(frame, at, {
      y: options.rise ?? motion.entrance.distance,
      dur: motion.chip,
      easing: motion.rise.easing,
    });
  }
  const progress = motion.ramp(frame, at, motion.panel, motion.rise.easing);
  return {
    clipPath: `inset(0 ${_formatPercent(1 - progress)} 0 0)`,
    transform: `translateX(${Motion.mix({
      t: progress,
      from: WIPE_TRAVEL_PERCENT,
      to: 0,
    }).toFixed(2)}%)`,
  };
}
/**
 * Retracts a line from the right edge back to its left edge, the reverse of
 * a `wipe` reveal, for example a wordmark withdrawing before its mark flies
 * through the frame.
 */
function _getWipeExitStyle({
  frame,
  at,
  durationInFrames,
  motion = StageTheme.getClassicStageMotion(),
}: Readonly<GetWipeExitStyleOptions>): CSSProperties {
  const progress = motion.ramp(
    frame,
    at,
    durationInFrames,
    motion.travel.easing,
  );
  return { clipPath: `inset(0 ${_formatPercent(progress)} 0 0)` };
}
/**
 * How a scene's title and kicker arrive: `rise` (the default) lifts each in
 * with a fade, `wipe` reveals each left to right behind a clip, the kicker
 * `staggerFrames` after the title.
 */
export type HeadingReveal = {
  mode: "rise" | "wipe";
  /** Frame the title starts. Default 0. */
  atFrame?: number;
  /** Frames between the title and the kicker starting. Default the panel
   *  duration. */
  staggerFrames?: number;
};
/**
 * The styles of a scene heading's title and kicker at `frame`. With no
 * reveal they rise in from frame 0, the kicker a panel later, as every
 * scene heading always has.
 */
function _getHeadingRevealStyles({
  frame,
  reveal,
  motion = StageTheme.getClassicStageMotion(),
}: Readonly<{
  frame: number;
  reveal: HeadingReveal | undefined;
  motion?: VideoMotion;
}>): {
  title: CSSProperties;
  kicker: CSSProperties;
} {
  const titleAt = reveal?.atFrame ?? 0;
  const kickerAt = titleAt + (reveal?.staggerFrames ?? motion.panel);
  if (reveal?.mode === "wipe") {
    return {
      title: _getLineRevealStyle({
        frame,
        at: titleAt,
        mode: "wipe",
        options: {},
        motion,
      }),
      kicker: _getLineRevealStyle({
        frame,
        at: kickerAt,
        mode: "wipe",
        options: {},
        motion,
      }),
    };
  }
  return {
    title: motion.enter(frame, titleAt, { y: TITLE_RISE, dur: motion.sheet }),
    kicker: motion.enter(frame, kickerAt, { y: KICKER_RISE }),
  };
}
function _formatPercent(fraction: number): string {
  return `${Number((fraction * 100).toFixed(2))}%`;
}
/**
 * A staged exit: elements fade out in place one after another, for example
 * a statement leaving before its icon so the field empties in steps rather
 * than in one dissolve.
 */
export type StagedExit = {
  atFrame: number;
  /** Frames between one element's fade and the next. Default the rise
   *  stagger. */
  staggerFrames?: number;
  /** Frames each element takes to fade. Default the chip duration. */
  durationInFrames?: number;
};
/**
 * The opacity of the element at `orderIndex` (0 leaves first) during a
 * staged exit, each fade on the dissolve curve. No exit leaves the element
 * untouched.
 */
function _getStagedExitStyle({
  frame,
  exit,
  orderIndex,
  motion = StageTheme.getClassicStageMotion(),
}: Readonly<GetStagedExitStyleOptions>): CSSProperties {
  if (!exit) {
    return {};
  }
  const at =
    exit.atFrame + orderIndex * (exit.staggerFrames ?? motion.rise.stagger);
  const progress = motion.ramp(
    frame,
    at,
    exit.durationInFrames ?? motion.chip,
    motion.dissolve.easing,
  );
  return { opacity: 1 - progress };
}
/**
 * When a statement's icon and lines start. An icon without its own
 * `atFrame` fades in at `revealAtFrame` and the lines follow a panel later;
 * an icon with one keeps it, and the lines start at `revealAtFrame`.
 */
function _getTypographyRevealFrames({
  revealAtFrame,
  icon,
  motion = StageTheme.getClassicStageMotion(),
}: Readonly<{
  revealAtFrame: number;
  icon:
    | {
        atFrame?: number;
      }
    | undefined;
  motion?: VideoMotion;
}>): {
  iconAt?: number;
  linesAt: number;
} {
  if (!icon) {
    return { linesAt: revealAtFrame };
  }
  if (icon.atFrame === undefined) {
    return { iconAt: revealAtFrame, linesAt: revealAtFrame + motion.panel };
  }
  return { iconAt: icon.atFrame, linesAt: revealAtFrame };
}

/** Samples themed text entrances and exits for reusable typography scenes. */
export const TextReveal = {
  /**
   * The style of one line, label or icon arriving at frame `at`, shared by
   * scenes that stage text line by line, for example a headline beside a window
   * or a wordmark beside a logo.
   */
  getLineRevealStyle: _getLineRevealStyle,
  /**
   * Retracts a line from the right edge back to its left edge, the reverse of a
   * `wipe` reveal, for example a wordmark withdrawing before its mark flies
   * through the frame.
   */
  getWipeExitStyle: _getWipeExitStyle,
  /** The styles of a scene heading's title and kicker at `frame`. */
  getHeadingRevealStyles: _getHeadingRevealStyles,
  /**
   * The opacity of the element at `orderIndex` (0 leaves first) during a staged
   * exit, each fade on the dissolve curve.
   */
  getStagedExitStyle: _getStagedExitStyle,
  /** When a statement's icon and lines start. */
  getTypographyRevealFrames: _getTypographyRevealFrames,
};
