import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getJournalGeometryFromFrame } from "./getJournalGeometryFromFrame";
import { ReceiptText } from "./ReceiptText";
import type { Input } from "./JournalReceipts.schema";
import type { ReactNode } from "react";
type Props = {
  receipt: Input["receipts"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
/**
 * A receipt emerges from a separate pocket and registers at its referenced
 * entry.
 */
export function ReceiptHalf({
  receipt,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const entryIndex = input.entries.findIndex(
    ({ id }) => id === receipt.entryId,
  );
  const { receiptX, receiptY } = getJournalGeometryFromFrame({
    index: entryIndex,
    frame,
    direction: input.foldDirection,
  });
  const progress = ramp(frame, 60 + index * 12, 20, EASE.inOut);
  const horizontal = input.foldDirection === "horizontal";
  const width = horizontal ? 150 : 260;
  const height = horizontal ? 104 : 62;
  const pocketX = horizontal ? 800 : 690;
  if (frame < 60 + index * 12) {
    return undefined;
  }
  return (
    <g
      data-receipt={receipt.entryId}
      data-target-x={receiptX}
      data-target-y={receiptY}
      transform={`translate(${mix(progress, pocketX, receiptX)} ${mix(progress, 280 + index * 12, receiptY)})`}
    >
      <path
        d={`M0 0 h${width} v${height} h-${width} l4 -6 l-4 -6 z`}
        fill={STOCK.elevated}
        stroke={accent}
      />
      <ReceiptText {...{ receipt, input, accent, width }} />
    </g>
  );
}
