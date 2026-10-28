import { EASE, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { CleanupCells } from "./CleanupCells";
import { CleanupRowCopy } from "./CleanupRowCopy";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";
type Props = {
  row: Input["rows"][number];
  index: number;
  frame: number;
  input: Input;
  accent: string;
};
/** Each row remains anchored while only its changed data crossfades. */
export function CleanupRow({
  row,
  index,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const edit =
    row.before !== row.after ? ramp(frame, 40 + index * 2, 64, EASE.inOut) : 0;
  return (
    <g
      data-cleanup-row={row.id}
      transform={`translate(0 ${142 + index * 88})`}
      opacity={ramp(frame, 12 + index * 2, 12)}
    >
      <rect
        x={64}
        y={0}
        width={832}
        height={82}
        rx={3}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <CleanupCells
        row={row}
        edit={edit}
        showWhitespace={input.showWhitespace}
        accent={accent}
      />
      <CleanupRowCopy row={row} input={input} frame={frame} />
    </g>
  );
}
