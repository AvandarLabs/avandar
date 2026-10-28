import { mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { GridLiteralCell } from "./GridLiteralCell";
import type { ReactNode } from "react";
type Props = {
  value: string;
  x: number;
  y: number;
  registration: number;
  isResult: boolean;
  rowIndex: number;
  columnIndex: number;
  width: number;
  accent: string;
};
/** Every literal occurrence keeps its original row and column identity. */
export function ReconstructionCell({
  value,
  x,
  y,
  registration,
  isResult,
  rowIndex,
  columnIndex,
  width,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        data-source-cell={!isResult ? `${rowIndex}:${columnIndex}` : undefined}
        data-result-cell={isResult ? `${rowIndex}:${columnIndex}` : undefined}
        x={x}
        y={y}
        width={width}
        height={64}
        fill="none"
        stroke={isResult ? accent : STOCK.line}
      />
      <g opacity={isResult ? 1 : registration}>
        <GridLiteralCell
          value={value}
          x={x + 8}
          y={y + 17 + (!isResult ? mix(registration, 8, 0) : 0)}
        />
      </g>
    </g>
  );
}
