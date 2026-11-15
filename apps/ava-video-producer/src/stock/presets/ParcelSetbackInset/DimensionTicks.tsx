import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  width: number;
  height: number;
  marker: string;
  side?: "outside" | "inside";
};
/** Dimension witness ticks follow the complete rectangle they measure. */
export function DimensionTicks({
  x,
  y,
  width,
  height,
  marker,
  side = "outside",
}: Readonly<Props>): ReactNode {
  const offset = side === "outside" ? -9 : 3;
  return (
    <path
      data-dimension-ticks={marker}
      d={`M${x} ${y + offset - 4} v8 M${x + width} ${y + offset - 4} v8 M${x} ${y + offset} H${x + width} M${x + offset - 4} ${y} h8 M${x + offset - 4} ${y + height} h8 M${x + offset} ${y} V${y + height}`}
      fill="none"
      stroke={STOCK.muted}
      strokeWidth={0.8}
    />
  );
}
