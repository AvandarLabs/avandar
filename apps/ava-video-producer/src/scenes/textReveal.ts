import { DUR, EASE, enter, mix, ramp } from "../motion";
import type { CSSProperties } from "react";

/**
 * How a block of text arrives. `word-mask` (each word rising through its own
 * mask) is drawn word by word by the scene itself; the others apply to a
 * whole line or label through `getLineRevealStyle`.
 */
export type TextRevealMode = "word-mask" | "line-fade" | "wipe" | "cut";

/** How far a wiped line travels sideways while it is revealed, in percent. */
const WIPE_TRAVEL_PERCENT = -8;

/**
 * The style of one line, label or icon arriving at frame `at`, shared by
 * scenes that stage text line by line, for example a headline beside a
 * window or a wordmark beside a logo. `line-fade` fades with a small rise
 * (`rise` pixels, 0 for a pure fade), `wipe` reveals left to right behind a
 * clip, and `cut` appears on its frame.
 */
export function getLineRevealStyle(
  frame: number,
  at: number,
  mode: Exclude<TextRevealMode, "word-mask">,
  options: { rise?: number } = {},
): CSSProperties {
  if (mode === "cut") {
    return { opacity: frame >= at ? 1 : 0 };
  }
  if (mode === "line-fade") {
    return enter(frame, at, {
      y: options.rise ?? 12,
      dur: DUR.chip,
      easing: EASE.word,
    });
  }
  const progress = ramp(frame, at, DUR.panel, EASE.word);
  return {
    clipPath: `inset(0 ${_formatPercent(1 - progress)} 0 0)`,
    transform: `translateX(${mix(progress, WIPE_TRAVEL_PERCENT, 0).toFixed(2)}%)`,
  };
}

/**
 * Retracts a line from the right edge back to its left edge, the reverse of
 * a `wipe` reveal, for example a wordmark withdrawing before its mark flies
 * through the frame.
 */
export function getWipeExitStyle(
  frame: number,
  at: number,
  durationInFrames: number,
): CSSProperties {
  const progress = ramp(frame, at, durationInFrames, EASE.inOut);
  return { clipPath: `inset(0 ${_formatPercent(progress)} 0 0)` };
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
  /** Frames between one element's fade and the next. Default 3. */
  staggerFrames?: number;
  /** Frames each element takes to fade. Default `DUR.chip`. */
  durationInFrames?: number;
};

/** Frames between elements of a staged exit when the plan omits it. */
const STAGED_EXIT_STAGGER = 3;

/**
 * The opacity of the element at `orderIndex` (0 leaves first) during a
 * staged exit. No exit leaves the element untouched.
 */
export function getStagedExitStyle(
  frame: number,
  exit: StagedExit | undefined,
  orderIndex: number,
): CSSProperties {
  if (!exit) {
    return {};
  }
  const at =
    exit.atFrame + orderIndex * (exit.staggerFrames ?? STAGED_EXIT_STAGGER);
  const progress = ramp(
    frame,
    at,
    exit.durationInFrames ?? DUR.chip,
    EASE.inOut,
  );
  return { opacity: 1 - progress };
}

/**
 * When a statement's icon and lines start. An icon without its own
 * `atFrame` fades in at `revealAtFrame` and the lines follow a panel later;
 * an icon with one keeps it, and the lines start at `revealAtFrame`.
 */
export function getTypographyRevealFrames(
  revealAtFrame: number,
  icon: { atFrame?: number } | undefined,
): { iconAt?: number; linesAt: number } {
  if (!icon) {
    return { linesAt: revealAtFrame };
  }
  if (icon.atFrame === undefined) {
    return { iconAt: revealAtFrame, linesAt: revealAtFrame + DUR.panel };
  }
  return { iconAt: icon.atFrame, linesAt: revealAtFrame };
}
