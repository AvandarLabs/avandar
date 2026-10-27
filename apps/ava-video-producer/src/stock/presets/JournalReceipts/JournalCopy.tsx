import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./JournalReceipts.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input };
/** Supplied state legends keep pending and acknowledged meanings explicit. */
export function JournalCopy({ frame, input }: Readonly<Props>): ReactNode {
  if (!input.showLabels) {
    return undefined;
  }
  const captions = [
    { text: input.copy.journal, x: 480, y: 56, width: 700 },
    {
      text: frame < 36 ? input.copy.disconnected : input.copy.reconnected,
      x: 480,
      y: 92,
      width: 700,
    },
    { text: input.copy.pending, x: 250, y: 132, width: 360 },
    { text: input.copy.acknowledged, x: 700, y: 132, width: 360 },
    { text: input.copy.receiptPocket, x: 800, y: 182, width: 260 },
    { text: input.copy.example, x: 480, y: 576, width: 700 },
  ];
  return (
    <g>
      {captions.map(({ text, x, y, width }) => (
        <FitText
          key={y + x}
          {...{ text, x, y, width }}
          fontSize={14}
          maxLines={y === 182 ? 3 : 2}
          anchor="middle"
          normalizeWhitespace
          breakLongWords
          color={STOCK.muted}
        />
      ))}
    </g>
  );
}
