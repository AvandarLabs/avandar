import { StockRect } from "../../primitives/StockRect/StockRect";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { rowKey: string; y: number; label: string; progress: number };
/** A left join retains an explicit authored absent-partner label. */
export function JoinMissingPartner({
  rowKey,
  y,
  label,
  progress,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={progress} data-empty-partner={rowKey}>
      <StockRect
        x={480}
        y={y}
        width={416}
        height={60}
        rx={4}
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeDasharray="5 5"
      />
      <FitText
        text={label}
        x={492}
        y={y + 34}
        width={390}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
