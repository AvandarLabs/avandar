import { Motion } from "../../../motion";
import { RESULT_CUE, SETTLED_CUE } from "./getEvidenceFromFrame";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./PdfGridReconstruction.schema";

type GetReconstructionColumnXsFromFrameOptions = {
  input: Input;
  frame: number;
  isResult: boolean;
  motion: VideoMotion;
};
/**
 * Complete result columns travel in a clear lane beside the retained source.
 */
export function getReconstructionColumnXsFromFrame({
  input,
  frame,
  isResult,
  motion,
}: Readonly<GetReconstructionColumnXsFromFrameOptions>): number[] {
  const width = 400 / input.grid.columnLabels.length;
  return input.grid.columnLabels.map((_, columnIndex) => {
    // Columns leave one after another and all settle together.
    const leaveAt = RESULT_CUE + columnIndex * motion.stagger.list;
    const travel = Motion.ramp({
      frame,
      at: leaveAt,
      dur: SETTLED_CUE - leaveAt,
      easing: motion.travel.easing,
    });
    return (
      (isResult
        ? Motion.mix({
            t: travel,
            from: 548,
            to: 508,
          })
        : 52) +
      columnIndex * width
    );
  });
}
