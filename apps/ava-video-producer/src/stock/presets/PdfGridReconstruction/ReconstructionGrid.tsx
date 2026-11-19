import { ramp } from "../../../motion";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { getReconstructionColumnXsFromFrame } from "./getReconstructionColumnXsFromFrame";
import { ReconstructionCell } from "./ReconstructionCell";
import { ReconstructionHeaders } from "./ReconstructionHeaders";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; isResult: boolean };

/** The cue the first literal cell registers on the page. */
const REGISTER_CUE = 56;
/** Frames each literal cell takes to register. */
const REGISTER_FRAMES = 19;
/** Coordinate occurrences register before an equal sized result unfolds. */
export function ReconstructionGrid({
  input,
  frame,
  accent,
  isResult,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const columnXs = getReconstructionColumnXsFromFrame({
    input,
    frame,
    isResult,
    motion,
  });
  const width = 400 / input.grid.columnLabels.length;
  return (
    <g data-grid-region={isResult ? "result" : "source"}>
      <ReconstructionHeaders input={input} columnXs={columnXs} width={width} />
      {input.grid.rows.flatMap((row, rowIndex) => {
        return row.map((value, columnIndex) => {
          return (
            <ReconstructionCell
              key={`${rowIndex}:${columnIndex}`}
              value={value}
              rowIndex={rowIndex}
              columnIndex={columnIndex}
              x={columnXs[columnIndex]}
              y={290 + rowIndex * 64}
              registration={ramp(
                frame,
                REGISTER_CUE +
                  (rowIndex * input.grid.columnLabels.length + columnIndex) *
                    motion.stagger.list,
                motion.scale(REGISTER_FRAMES),
                motion.entrance.easing,
              )}
              isResult={isResult}
              width={width}
              accent={accent}
            />
          );
        });
      })}
    </g>
  );
}
