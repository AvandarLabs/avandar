import { Motion } from "../../../motion";
import { LABELS_CUE, OPEN_CUE } from "./journalTiming";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./JournalReceipts.schema";
/** Inputs for getJournalGeometryFromFrame. */
type GetJournalGeometryFromFrameArguments = {
  index: number;
  frame: number;
  direction: Input["foldDirection"];
  motion: VideoMotion;
};

/** Data for getJournalGeometryFromFrame. */
type GetJournalGeometryResult = {
  x: number;
  y: number;
  width: number;
  height: number;
  receiptX: number;
  receiptY: number;
};
/**
 * Exact shared registration anchors for journal folds and matching receipt
 * halves.
 */
export function getJournalGeometryFromFrame({
  index,
  frame,
  direction,
  motion,
}: Readonly<GetJournalGeometryFromFrameArguments>): GetJournalGeometryResult {
  // The journal is open by the time entry labels appear.
  const opening = Motion.ramp({
    frame,
    at: OPEN_CUE,
    dur: LABELS_CUE - OPEN_CUE,
    easing: motion.entrance.easing,
  });
  return direction === "horizontal"
    ? {
        x: 46 + index * Motion.mix({ t: opening, from: 28, to: 152 }),
        y: 230,
        width: 150,
        height: 254,
        receiptX: 46 + index * 152,
        receiptY: 392,
      }
    : {
        x: 110,
        y: 192 + index * Motion.mix({ t: opening, from: 12, to: 66 }),
        width: 580,
        height: 62,
        receiptX: 430,
        receiptY: 192 + index * 66,
      };
}
