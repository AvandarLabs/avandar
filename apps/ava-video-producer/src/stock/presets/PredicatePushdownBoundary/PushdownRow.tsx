import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = {
  row: Input["rows"][number];
  x: number;
  y: number;
  source: boolean;
  accent: string;
  opacity?: number;
};
/** A stable authored row identity and signed value travel together. */
export function PushdownRow({
  row,
  x,
  y,
  source,
  accent,
  opacity = 1,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-source-row={source ? row.id : undefined}
      data-transfer-row={source ? undefined : row.id}
      data-x={x}
      data-y={y}
      data-value={row.value}
      opacity={opacity}
    >
      <StockRect
        x={x - 8}
        y={y - 18}
        width={332}
        height={32}
        rx={5}
        fill={STOCK.surface}
        stroke={source ? STOCK.line : accent}
      />
      <LiteralDataText value={row.id} x={x} y={y - 5} />
      <LabelSlots labels={[[String(row.value), x, y + 10, 316, 12, 1]]} />
    </g>
  );
}
