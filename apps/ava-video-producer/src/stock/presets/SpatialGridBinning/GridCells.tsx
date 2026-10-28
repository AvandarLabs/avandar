import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { GridCell } from "./GridCell";
import { makeGridSceneFromInputAndFrame } from "./makeGridSceneFromInputAndFrame";
import type { Input } from "./SpatialGridBinning.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Square source bins and a separate count-token ledger. */
export function GridCells({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { cells } = makeGridSceneFromInputAndFrame({ input, frame });
  const { columns, rows } = input.grid;
  return (
    <g>
      {cells.map((cell) => (
        <g key={cell.index}>
          <rect
            data-cell-shade={cell.index}
            x={48 + (cell.column * 330) / columns}
            y={164 + (cell.row * 330) / rows}
            width={330 / columns}
            height={330 / rows}
            fill={accent}
            fillOpacity={
              ramp(frame, 111, 28) *
              (0.04 + (cell.count / input.points.length) * 0.36)
            }
            stroke={STOCK.line}
            strokeOpacity={ramp(frame, 13, 37)}
          />
          <GridCell input={input} cell={cell} frame={frame} />
        </g>
      ))}
    </g>
  );
}
