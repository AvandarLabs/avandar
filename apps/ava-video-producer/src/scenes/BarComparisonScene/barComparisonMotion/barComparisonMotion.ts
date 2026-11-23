import { TextLayout } from "../../layout/TextLayout";
import { StageTheme } from "../../StageTheme/StageTheme";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";

type GetBarComparisonBeatsOptions = {
  revealAtFrame: number;
  panelIndex: number;
  panelStaggerFrames: number;
  motion?: VideoMotion;
};
type GetEraseStartFramesOptions = {
  atFrame: number;
  elementCounts: number[];
  staggerFrames: number;
  panelStaggerFrames: number;
};
/**
 * When each layer of one `BarComparisonScene` panel starts: the hero number,
 * the row labels, the bars and the row values. Panels after the first start
 * `panelStaggerFrames` later each, so two charts read left to right. Gaps
 * between layers are the theme's durations, so they follow its tempo.
 */
function _getBarComparisonBeats({
  revealAtFrame,
  panelIndex,
  panelStaggerFrames,
  motion = StageTheme.getClassicStageMotion(),
}: Readonly<GetBarComparisonBeatsOptions>): {
  heroAt: number;
  labelsAt: number;
  barsAt: number;
  valuesAt: number;
} {
  const heroAt = revealAtFrame + panelIndex * panelStaggerFrames;
  // Labels follow the hero, bars follow the first labels, and values land
  // once the bars have nearly finished growing.
  const labelsAt = heroAt + motion.panel;
  const barsAt = labelsAt + motion.chip;
  return {
    heroAt,
    labelsAt,
    barsAt,
    valuesAt: barsAt + motion.sheet + motion.stagger.list,
  };
}
/** Each row's bar length as a fraction of the panel's longest bar. */
function _getBarFractions(
  rows: ReadonlyArray<{
    value: number;
  }>,
): number[] {
  const longest = Math.max(
    0,
    ...rows.map((row) => {
      return row.value;
    }),
  );
  return rows.map((row) => {
    return longest > 0 ? row.value / longest : 0;
  });
}
/**
 * The frame each element of each panel starts erasing, in reading order
 * within a panel and panel by panel. Fractional frames are kept so a long
 * list still erases inside a short exit.
 */
function _getEraseStartFrames({
  atFrame,
  elementCounts,
  staggerFrames,
  panelStaggerFrames,
}: GetEraseStartFramesOptions): number[][] {
  return elementCounts.map((count, panelIndex) => {
    return Array.from({ length: count }, (_, elementIndex) => {
      return (
        atFrame + panelIndex * panelStaggerFrames + elementIndex * staggerFrames
      );
    });
  });
}
/** Points along the right edge of a rough bar. */
const ROUGH_EDGE_STEPS = 9;
/**
 * A torn, brush-like right edge for a bar, as a clip path. The jitter is
 * seeded by the row so every frame of a render draws the same edge.
 */
function _getRoughEdgeClipPath({
  seed,
  depth,
}: Readonly<{
  seed: number;
  depth: number;
}>): string {
  const points = Array.from({ length: ROUGH_EDGE_STEPS }, (_, step) => {
    const noise = _seededUnit(seed * 31 + step * 7 + 1);
    const y = (step / (ROUGH_EDGE_STEPS - 1)) * 100;
    return `calc(100% - ${(noise * depth).toFixed(2)}px) ${Number(y.toFixed(2))}%`;
  });
  return `polygon(0% 0%, ${points.join(", ")}, 0% 100%)`;
}
/** A deterministic pseudo-random value in 0..1 for an integer seed. */
function _seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}
/** The text at a row's end: its display text, or its value at the panel's
 *  precision, so a value is never shown rounded to a different number. */
function _rowValueLabel({
  row,
  precision,
}: Readonly<{
  row: {
    value: number;
    display?: string;
  };
  precision: number;
}>): string {
  return (
    row.display ??
    TextLayout.formatMetric({
      value: row.value,
      precision,
    })
  );
}

/**
 * Samples comparison beats, bar reveals, and row labels for
 * BarComparisonScene.
 */
export const BarComparisonMotion = {
  /**
   * When each layer of one `BarComparisonScene` panel starts: the hero number,
   * the row labels, the bars and the row values.
   */
  getBarComparisonBeats: _getBarComparisonBeats,
  /** Each row's bar length as a fraction of the panel's longest bar. */
  getBarFractions: _getBarFractions,
  /**
   * The frame each element of each panel starts erasing, in reading order
   * within a panel and panel by panel.
   */
  getEraseStartFrames: _getEraseStartFrames,
  /** A torn, brush-like right edge for a bar, as a clip path. */
  getRoughEdgeClipPath: _getRoughEdgeClipPath,
  /**
   * The text at a row's end: its display text, or its value at the panel's
   * precision, so a value is never shown rounded to a different number.
   */
  rowValueLabel: _rowValueLabel,
};
