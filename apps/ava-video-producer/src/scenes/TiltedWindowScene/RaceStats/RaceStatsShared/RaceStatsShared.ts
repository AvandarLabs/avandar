import { type WindowStage } from "../../WindowMotion/WindowMotion.types";
import { PAIR_BOXES } from "../../windowTilt";
import { type StatLineProps } from "./RaceStatsShared.types";
import type { RaceColumn } from "../../../scenes.types";
/** The left edge of a column's label and counter. */
function _getStatLeft({ side, width }: StatLineProps): number {
  return PAIR_BOXES[side].x * width + width * 0.027;
}
/**
 * How far the counter has run, linearly, and how far it has turned to the
 * brand colour since finishing, both 0 to 1.
 */
function _getCounterProgress({
  frame,
  counter,
  motion,
}: Readonly<{
  frame: number;
  counter: RaceColumn["counter"];
  motion: WindowStage["motion"];
}>) {
  return {
    elapsed: motion.ramp(
      frame,
      counter.startFrame,
      counter.endFrame - counter.startFrame,
      (t) => {
        return t;
      },
    ),
    done: motion.ramp(
      frame,
      counter.endFrame,
      motion.chip,
      motion.entrance.easing,
    ),
  };
}
/**
 * Counter progress and label positions used by RaceCounter, RaceLabel,
 * RaceStat, RaceStats, and RaceBadge.
 */
export const RaceStatsShared = {
  /** The left edge of a column's label and counter. */
  getStatLeft: _getStatLeft,
  /**
   * How far the counter has run, linearly, and how far it has turned to the
   * brand colour since finishing, both 0 to 1.
   */
  getCounterProgress: _getCounterProgress,
} as const;
