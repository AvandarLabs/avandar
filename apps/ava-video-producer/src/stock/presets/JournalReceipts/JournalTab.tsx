import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getJournalGeometryFromFrame } from "./getJournalGeometryFromFrame";
import { JournalEntryText } from "./JournalEntryText";
import type { Input } from "./JournalReceipts.schema";
import type { ReactNode } from "react";
type Props = {
  entry: Input["entries"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

function _getClosingProgress({
  frame,
  input,
  entryId,
}: {
  frame: number;
  input: Readonly<Input>;
  entryId: string;
}): number {
  const receiptIndex = input.receipts.findIndex(propEq("entryId", entryId));
  return receiptIndex < 0 ? 0 : ramp(frame, 80 + receiptIndex * 12, 8);
}

/** An unmatched fold stays raised even after every supplied receipt arrives. */
export function JournalTab({
  entry,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const geometry = getJournalGeometryFromFrame({
    index,
    frame,
    direction: input.foldDirection,
  });
  const closing = _getClosingProgress({ frame, input, entryId: entry.id });
  const rise = 28 * (1 - closing);
  const horizontal = input.foldDirection === "horizontal";
  const { x, y, width, height, receiptX, receiptY } = geometry;
  return (
    <g
      data-journal-entry={entry.id}
      data-tab-rise={rise}
      data-target-x={receiptX}
      data-target-y={receiptY}
      transform={`translate(${x} ${y})`}
    >
      <path
        d={`M0 0 h${width} v${height} h-${width} z`}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <path
        data-fold-face={entry.id}
        d={
          horizontal
            ? `M0 0 l12 ${-rise} h${width - 24} l12 ${rise} z`
            : `M0 0 l${-rise} 10 v${height - 20} l${rise} 10 z`
        }
        fill={STOCK.elevated}
        stroke={closing === 1 ? accent : STOCK.orange}
      />
      <JournalEntryText {...{ entry, input, frame }} />
      <circle
        cx={width - 12}
        cy={height - 12}
        r={3}
        fill={closing === 1 ? accent : STOCK.orange}
      />
    </g>
  );
}
