import { ramp } from "../../../motion";
import { getReconstructionColumnXsFromFrame } from "./getReconstructionColumnXsFromFrame";
import { ReconstructionCell } from "./ReconstructionCell";
import { ReconstructionHeaders } from "./ReconstructionHeaders";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string; isResult: boolean };
/** Coordinate occurrences register before an equal sized result unfolds. */
export function ReconstructionGrid({
  input,
  frame,
  accent,
  isResult,
}: Readonly<Props>): ReactNode {
  const columnXs = getReconstructionColumnXsFromFrame({
    input,
    frame,
    isResult,
  });
  const width = 400 / input.grid.columnLabels.length;
  return (
    <g data-grid-region={isResult ? "result" : "source"}>
      <ReconstructionHeaders input={input} columnXs={columnXs} width={width} />
      {input.grid.rows.flatMap((row, rowIndex) =>
        row.map((value, columnIndex) => (
          <ReconstructionCell
            key={`${rowIndex}:${columnIndex}`}
            value={value}
            rowIndex={rowIndex}
            columnIndex={columnIndex}
            x={columnXs[columnIndex]}
            y={290 + rowIndex * 64}
            registration={ramp(
              frame,
              56 +
                (rowIndex * input.grid.columnLabels.length + columnIndex) * 2,
              19,
            )}
            isResult={isResult}
            width={width}
            accent={accent}
          />
        )),
      )}
    </g>
  );
}
