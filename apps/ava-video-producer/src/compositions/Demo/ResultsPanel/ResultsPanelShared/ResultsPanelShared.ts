import { REFILTER_AT, ROWS_AT } from "../../timeline";
import type { VideoMotion } from "../../../../videoTheme/createVideoMotion/createVideoMotion";

type RowProgressOptions = {
  frame: number;
  index: number;
  isPaid: boolean;
  motion: VideoMotion;
};
/** Cues after the app arrives and the rows land, in frames. */
const CUES = { emptyState: 4, rows: 8, bar: 4, total: 20 };
/** How far each part rises as it arrives, in pixels. */
const RISE = { panel: 14, row: 10, total: 8 };
/** The panel's starting scale as it arrives. */
const PANEL_START_SCALE = 0.985;
/** A row's bar growth and filter cut on one frame, both 0 to 1. */
function _rowProgress({
  frame,
  index,
  isPaid,
  motion,
}: Readonly<RowProgressOptions>) {
  const at = ROWS_AT + CUES.rows;
  const stagger = index * motion.stagger.list;
  return {
    grow: motion.ramp(
      frame,
      at + stagger + CUES.bar,
      motion.hero,
      motion.entrance.easing,
    ),
    // 0 while the row belongs in the result, 1 once the filter has excluded
    // it, staggered by index, so the list resolves rather than blinking.
    // Same reasoning as the entrance stagger.
    cut: isPaid
      ? 0
      : motion.ramp(
          frame,
          REFILTER_AT + stagger,
          motion.sheet,
          motion.reveal.easing,
        ),
  };
}
/** Shared values and calculations for the ResultsPanel visuals. */
export const ResultsPanelShared = {
  /** Cues after the app arrives and the rows land, in frames. */
  CUES,
  /** How far each part rises as it arrives, in pixels. */
  RISE,
  /** The panel's starting scale as it arrives. */
  PANEL_START_SCALE,
  /** A row's bar growth and filter cut on one frame, both 0 to 1. */
  rowProgress: _rowProgress,
} as const;
