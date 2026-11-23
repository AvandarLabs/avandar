import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getEvidenceFromFrame } from "../getEvidenceFromFrame";
import type { Input } from "../PdfGridReconstruction.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; frame: number; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  width: number;
  height: number;
  progress: number;
};

/**
 * Returns ruled grid dimensions, evidence progress, and theme values for
 * `RuledGridEvidence`, `VerticalRulingLines`.
 */
export function useRuledGridEvidencePresentation({
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const width = 400 / input.grid.columnLabels.length;
  const height = 80 + input.grid.rows.length * 64;
  const progress = getEvidenceFromFrame({ frame, motion });
  return { input, accent, tokens, width, height, progress };
}
