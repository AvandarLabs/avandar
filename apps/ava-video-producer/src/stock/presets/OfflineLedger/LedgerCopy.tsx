import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./OfflineLedger.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input };
/** Captions change with connectivity while the completed work remains. */
export function LedgerCopy({ frame, input }: Readonly<Props>): ReactNode {
  if (!input.showLabels) {
    return undefined;
  }
  const captions = [
    { text: frame < 36 ? input.copy.connected : input.copy.offline, y: 65 },
    { text: input.surfaceLabel, y: 146 },
    ...(frame >= 44 ? [{ text: input.copy.storage, y: 514 }] : []),
    ...(frame >= 108 ? [{ text: input.copy.retained, y: 546 }] : []),
    { text: input.copy.example, y: 580 },
  ];
  return (
    <g>
      {captions.map(({ text, y }) => (
        <FitText
          key={y}
          text={text}
          x={480}
          y={y}
          width={600}
          fontSize={14}
          maxLines={2}
          anchor="middle"
          normalizeWhitespace
          breakLongWords
          color={y === 580 ? STOCK.muted : STOCK.text}
        />
      ))}
    </g>
  );
}
