import { mix, ramp } from "../../../motion";
import type { Input } from "./JournalReceipts.schema";
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
}: Readonly<{
  index: number;
  frame: number;
  direction: Input["foldDirection"];
}>): GetJournalGeometryResult {
  const opening = ramp(frame, 36, 20);
  return direction === "horizontal"
    ? {
        x: 46 + index * mix(opening, 28, 152),
        y: 230,
        width: 150,
        height: 254,
        receiptX: 46 + index * 152,
        receiptY: 392,
      }
    : {
        x: 110,
        y: 192 + index * mix(opening, 12, 66),
        width: 580,
        height: 62,
        receiptX: 430,
        receiptY: 192 + index * 66,
      };
}
