import { StageTheme } from "../../../scenes/StageTheme/StageTheme";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { CSSProperties } from "react";

type GetColumnWipeProgressOptions = {
  frame: number;
  durationInFrames: number;
  options: SteppedColumnWipeOptions;
  motion?: VideoMotion;
};
type GetSteppedColumnWipeStyleOptions = {
  frame: number;
  durationInFrames: number;
  options: SteppedColumnWipeOptions;
  motion?: VideoMotion;
};
/**
 * Defaults a `stepped-column-wipe` shot transition uses for omitted fields.
 * The stagger between columns defaults to the theme's `motion.stagger.column`.
 */
export const STEPPED_COLUMN_WIPE_DEFAULTS = {
  columns: 8,
  from: "bottom",
  order: "left-to-right",
} as const;

/** Column count, stagger, direction, and order of a stepped wipe. */
export type SteppedColumnWipeOptions = {
  columns?: number;
  staggerFrames?: number;
  from?: "bottom" | "top";
  order?: "left-to-right" | "right-to-left";
};
/**
 * How far each column has crossed the frame, 0 to 1, in screen order from
 * left to right, each rising on `motion.rise`. `StoryFilm` uses it through
 * `getSteppedColumnWipeStyle`; tests use it to check order and sub-frame
 * staggering.
 */
/** Geometry of a stepped column wipe, as authored on a shot transition. */
function _getColumnWipeProgress({
  frame,
  durationInFrames,
  options,
  motion = StageTheme.getClassicStageMotion(),
}: Readonly<GetColumnWipeProgressOptions>): number[] {
  const columns = options.columns ?? STEPPED_COLUMN_WIPE_DEFAULTS.columns;
  const stagger = options.staggerFrames ?? motion.stagger.column;
  // Every column travels for the same time, so the last one lands exactly
  // when the transition ends.
  const columnFrames = Math.max(1, durationInFrames - stagger * (columns - 1));
  const isReversed = options.order === "right-to-left";
  return Array.from({ length: columns }, (_, screenIndex) => {
    const orderIndex = isReversed ? columns - 1 - screenIndex : screenIndex;
    return motion.ramp(
      frame,
      orderIndex * stagger,
      columnFrames,
      motion.rise.easing,
    );
  });
}
/**
 * The clip that reveals the incoming shot of a stepped column wipe at one
 * transition frame: a staircase polygon whose steps are the columns. Returns
 * no clip once the transition has finished, so the shot renders unclipped.
 */
function _getSteppedColumnWipeStyle({
  frame,
  durationInFrames,
  options,
  motion = StageTheme.getClassicStageMotion(),
}: Readonly<GetSteppedColumnWipeStyleOptions>): CSSProperties {
  if (frame >= durationInFrames) {
    return {};
  }
  const progress = _getColumnWipeProgress({
    frame,
    durationInFrames,
    options,
    motion,
  });
  const isFromTop = options.from === "top";
  const edge = isFromTop ? 0 : 100;
  const steps = progress.flatMap((columnProgress, index) => {
    const left = (index / progress.length) * 100;
    const right = ((index + 1) / progress.length) * 100;
    const reach = isFromTop ? columnProgress * 100 : 100 - columnProgress * 100;
    return [
      `${_formatPercent(left)} ${_formatPercent(reach)}`,
      `${_formatPercent(right)} ${_formatPercent(reach)}`,
    ];
  });
  return {
    clipPath: `polygon(0% ${edge}%, ${steps.join(", ")}, 100% ${edge}%)`,
  };
}
function _formatPercent(value: number): string {
  return `${Number(value.toFixed(3))}%`;
}

/** Samples column wipe progress and clipping for StoryFilm transitions. */
export const SteppedColumnWipe = {
  /**
   * How far each column has crossed the frame, 0 to 1, in screen order from
   * left to right, each rising on `motion.rise`.
   */
  getColumnWipeProgress: _getColumnWipeProgress,
  /**
   * The clip that reveals the incoming shot of a stepped column wipe at one
   * transition frame: a staircase polygon whose steps are the columns.
   */
  getSteppedColumnWipeStyle: _getSteppedColumnWipeStyle,
};
