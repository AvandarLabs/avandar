import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getReconstructionColumnXsFromFrame } from "../getReconstructionColumnXsFromFrame";
import type { Input } from "../PdfGridReconstruction.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  input: Input;
  frame: number;
  accent: string;
  isResult: boolean;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  isResult: Options["isResult"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  columnXs: number[];
  width: number;
};

/**
 * Returns column positions, cell width, and grid motion values for
 * `ReconstructionGrid`.
 */
export function useReconstructionGridPresentation({
  input,
  frame,
  accent,
  isResult,
}: Readonly<Options>): Presentation {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const columnXs = getReconstructionColumnXsFromFrame({
    input,
    frame,
    isResult,
    motion,
  });
  const width = 400 / input.grid.columnLabels.length;
  return { input, frame, accent, isResult, motion, columnXs, width };
}
