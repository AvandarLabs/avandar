import { Motion } from "../../../../motion";
import { ReconstructionCell } from "../ReconstructionCell";
import { ReconstructionHeaders } from "../ReconstructionHeaders";
import { useReconstructionGridPresentation } from "./useReconstructionGridPresentation";
import type { Input } from "../PdfGridReconstruction.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; isResult: boolean };
/** The cue the first literal cell registers on the page. */
const REGISTER_CUE = 56;
/** Frames each literal cell takes to register. */
const REGISTER_FRAMES = 19;
/** Coordinate occurrences register before an equal sized result unfolds. */
export function ReconstructionGrid(props: Readonly<Props>): ReactNode {
  const presentation = useReconstructionGridPresentation(props);

  return (
    <g data-grid-region={props.isResult ? "result" : "source"}>
      <ReconstructionHeaders
        input={props.input}
        columnXs={presentation.columnXs}
        width={presentation.width}
      />
      {props.input.grid.rows.flatMap((row, rowIndex) => {
        return row.map((value, columnIndex) => {
          return (
            <ReconstructionCell
              key={`${rowIndex}:${columnIndex}`}
              value={value}
              rowIndex={rowIndex}
              columnIndex={columnIndex}
              x={presentation.columnXs[columnIndex]}
              y={290 + rowIndex * 64}
              registration={Motion.ramp({
                frame: props.frame,
                at:
                  REGISTER_CUE +
                  (rowIndex * props.input.grid.columnLabels.length +
                    columnIndex) *
                    presentation.motion.stagger.list,
                dur: presentation.motion.scale(REGISTER_FRAMES),
                easing: presentation.motion.entrance.easing,
              })}
              isResult={props.isResult}
              width={presentation.width}
              accent={props.accent}
            />
          );
        });
      })}
    </g>
  );
}
