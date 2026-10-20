import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { makeGridSceneFromInputAndFrame } from "./makeGridSceneFromInputAndFrame";
import type { Input } from "./SpatialGridBinning.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  cell: ReturnType<typeof makeGridSceneFromInputAndFrame>["cells"][number];
  frame: number;
};
/**
 * One ledger retains a separate header and twelve non-overlapping token slots.
 */
export function GridCell({ input, cell, frame }: Readonly<Props>): ReactNode {
  const { columns, rows } = input.grid;
  return (
    <g>
      <rect
        data-cell-count={cell.arrived}
        x={450 + (cell.column * 420) / columns}
        y={164 + (cell.row * 300) / rows}
        width={420 / columns}
        height={300 / rows}
        fill="none"
        stroke={STOCK.line}
        opacity={ramp(frame, 13, 37)}
      />
      <LabelSlots
        labels={[
          [
            `${cell.column + 1} · ${cell.row + 1}`,
            460 + (cell.column * 420) / columns,
            188 + (cell.row * 300) / rows,
            60,
            12,
            1,
          ],
          [
            String(cell.arrived),
            450 + ((cell.column + 1) * 420) / columns - 56,
            190 + (cell.row * 300) / rows,
            50,
            20,
            1,
          ],
        ]}
      />
    </g>
  );
}
