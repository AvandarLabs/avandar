import { STOCK } from "../../graphics-common";
import { FitText } from "../FitText/FitText";
import { StockRect } from "../StockRect/StockRect";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  width: number;
  text: string;
  highlighted?: boolean;
  color?: string;
};

/**
 * Bounded table presentation retains the caller's exact value or missing label.
 */
export function TableCell({
  x,
  y,
  width,
  text,
  highlighted = false,
  color = STOCK.mint,
}: Readonly<Props>): ReactNode {
  if (![x, y, width].every(Number.isFinite) || width < 100 || width > 800) {
    throw new Error(
      "Table cells require finite placement and widths from 100 to 800 pixels.",
    );
  }
  return (
    <g>
      <StockRect
        x={x}
        y={y}
        width={width}
        height={64}
        fill={highlighted ? color : STOCK.surface}
        fillOpacity={highlighted ? 0.08 : 1}
        stroke={highlighted ? color : STOCK.line}
      />
      <FitText
        x={x + 10}
        y={y + 24}
        width={width - 20}
        text={text}
        fontSize={16}
        maxLines={2}
      />
    </g>
  );
}
