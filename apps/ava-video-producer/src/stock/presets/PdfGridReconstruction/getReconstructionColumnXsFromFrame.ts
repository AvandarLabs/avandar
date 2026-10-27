import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./PdfGridReconstruction.schema";
/**
 * Complete result columns travel in a clear lane beside the retained source.
 */
export function getReconstructionColumnXsFromFrame({
  input,
  frame,
  isResult,
}: Readonly<{ input: Input; frame: number; isResult: boolean }>): number[] {
  const width = 400 / input.grid.columnLabels.length;
  return input.grid.columnLabels.map((_, columnIndex) => {
    const travel = ramp(
      frame,
      106 + columnIndex * 2,
      33 - columnIndex * 2,
      EASE.inOut,
    );
    return (isResult ? mix(travel, 548, 508) : 52) + columnIndex * width;
  });
}
