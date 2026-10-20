import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import type { ReactNode } from "react";
type Props = {
  value: string;
  x: number;
  y: number;
  side: "left" | "right";
  accent: string;
};
/** Key cells face one another and share the result seam when closed. */
export function JoinKeyCell({
  value,
  x,
  y,
  side,
  accent,
}: Readonly<Props>): ReactNode {
  const left = side === "left" ? x + 260 : x;
  return (
    <g>
      <StockRect
        data-key-cell={side}
        x={left}
        y={y}
        width={156}
        height={22}
        fill={accent}
        fillOpacity={0.08}
      />
      <LiteralDataText value={value} x={left + 12} y={y + 14} color={accent} />
    </g>
  );
}
