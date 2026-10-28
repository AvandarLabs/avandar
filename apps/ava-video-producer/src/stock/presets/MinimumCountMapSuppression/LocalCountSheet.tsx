import { STOCK } from "../../stockPalette";
import { LocalAggregateCell } from "./LocalAggregateCell";
import type { Input } from "./MinimumCountMapSuppression.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Aggregate-only local sheet with explicit analysis boundary and shutters. */
export function LocalCountSheet({ input, frame }: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        x={26}
        y={155}
        width={408}
        height={320}
        rx={14}
        fill="none"
        stroke={STOCK.muted}
        strokeDasharray="5 5"
      />
      {input.cells.map((cell, index) => (
        <LocalAggregateCell
          key={cell.id}
          cell={cell}
          index={index}
          minimum={input.minimum}
          showLocalCounts={input.showLocalCounts}
          frame={frame}
        />
      ))}
    </g>
  );
}
