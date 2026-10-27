import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
/**
 * Stable device and planner boundaries separate retained rows from messages.
 */
export function ExecutionBoundaries(): ReactNode {
  return (
    <g>
      <StockRect
        data-local-boundary="true"
        x={30}
        y={95}
        width={540}
        height={455}
        rx={18}
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={2}
      />
      <StockRect
        data-remote-boundary="true"
        x={618}
        y={95}
        width={310}
        height={455}
        rx={18}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <path
        data-network-boundary="true"
        d="M594 90 V552"
        stroke={STOCK.muted}
        strokeDasharray="6 6"
      />
    </g>
  );
}
