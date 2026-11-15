import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { LedgerEntryText } from "./LedgerEntryText";
import { LedgerImpression } from "./LedgerImpression";
import type { Input } from "./OfflineLedger.schema";
import type { ReactNode } from "react";

type Props = {
  entry: Input["entries"][number];
  index: number;
  frame: number;
  accent: string;
  input: Input;
};
/**
 * Each writing stroke presses one persistent matching impression beneath its
 * page.
 */
export function LedgerEntry({
  entry,
  index,
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const writing = ramp(frame, 36 + index * 16, 8);
  const y = 196 + index * 54;
  return (
    <g>
      <g
        data-ledger-entry={entry.id}
        data-write-at={36 + index * 16}
        opacity={writing}
      >
        <path d={`M208 ${y + 25} H752`} stroke={STOCK.line} />
        <path
          d={`M208 ${y - 8} H220`}
          pathLength={1}
          stroke={accent}
          strokeWidth={3}
          strokeDasharray={1}
          strokeDashoffset={1 - writing}
        />
        <LedgerEntryText {...{ entry, y }} showLabels={input.showLabels} />
      </g>
      <LedgerImpression
        {...{ index, frame, accent }}
        entryId={entry.id}
        isVisible={input.showStorageImpressions}
      />
    </g>
  );
}
