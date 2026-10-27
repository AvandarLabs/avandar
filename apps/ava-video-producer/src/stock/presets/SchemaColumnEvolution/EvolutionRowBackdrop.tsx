import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = {
  id: string;
  x: number;
  y: number;
  expansion: number;
  accent: string;
  isLater: boolean;
};
/** Persistent row body with a distinct later-generation edge. */
export function EvolutionRowBackdrop({
  id,
  x,
  y,
  expansion,
  accent,
  isLater,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <StockRect
        data-record-body={id}
        x={x}
        y={y}
        width={520 + 260 * expansion}
        height={60}
        rx={4}
        fill={STOCK.surface}
        stroke={isLater ? accent : STOCK.line}
      />
      {isLater ? (
        <path
          data-later-notch=""
          d={`M${x - 8} ${y + 8} V${y + 52}`}
          stroke={accent}
          strokeWidth={3}
        />
      ) : null}
    </g>
  );
}
