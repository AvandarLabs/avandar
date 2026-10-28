import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./OfflineLedger.schema";
import type { ReactNode } from "react";

type Props = {
  entry: Input["entries"][number];
  y: number;
  showLabels: boolean;
};
/** Complete entry text occupies fixed two-line label and value slots. */
export function LedgerEntryText({
  entry,
  y,
  showLabels,
}: Readonly<Props>): ReactNode {
  const labels = [
    { text: entry.label, x: 232, width: 220 },
    { text: entry.value, x: 472, width: 280 },
  ];
  return showLabels ? (
    <g>
      {labels.map(({ text, x, width }) => (
        <FitText
          key={x}
          {...{ text, x, width, y }}
          fontSize={14}
          maxLines={2}
          normalizeWhitespace
          breakLongWords
        />
      ))}
    </g>
  ) : (
    <path
      d={`M232 ${y - 7} H420 M472 ${y - 7} H718`}
      stroke={STOCK.muted}
      strokeWidth={3}
    />
  );
}
