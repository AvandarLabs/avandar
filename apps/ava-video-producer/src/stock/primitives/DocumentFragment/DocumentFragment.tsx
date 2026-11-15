import { STOCK } from "../../graphics-common";
import { FitText } from "../FitText/FitText";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  width: number;
  text: string;
  emphasized?: boolean;
  color?: string;
};

/**
 * Draws an authored fragment at a stable anchor with at most two text lines.
 */
export function DocumentFragment({
  x,
  y,
  width,
  text,
  emphasized = false,
  color = STOCK.mint,
}: Readonly<Props>): ReactNode {
  if (![x, y, width].every(Number.isFinite) || width < 100 || width > 800) {
    throw new Error(
      "Document fragments require finite placement and widths from 100 to 800 pixels.",
    );
  }
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={64}
        rx={5}
        fill={emphasized ? color : STOCK.surface}
        fillOpacity={emphasized ? 0.09 : 1}
      />
      <path
        d={`M${x} ${y + 64} H${x + width}`}
        stroke={emphasized ? color : STOCK.line}
        strokeWidth={emphasized ? 2 : 1}
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
