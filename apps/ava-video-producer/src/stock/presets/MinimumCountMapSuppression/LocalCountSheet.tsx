import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { LocalAggregateCell } from "./LocalAggregateCell";
import type { Input } from "./MinimumCountMapSuppression.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
const SHEET_DASH = "5 5";
/** Aggregate-only local sheet with explicit analysis boundary and shutters. */
export function LocalCountSheet({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={26}
        y={155}
        width={408}
        height={320}
        rx={scales.corner(14)}
        fill="none"
        stroke={tokens.color.inactive}
        strokeDasharray={SHEET_DASH}
      />
      {input.cells.map((cell, index) => {
        return (
          <LocalAggregateCell
            key={cell.id}
            cell={cell}
            index={index}
            minimum={input.minimum}
            showLocalCounts={input.showLocalCounts}
            frame={frame}
          />
        );
      })}
    </g>
  );
}
