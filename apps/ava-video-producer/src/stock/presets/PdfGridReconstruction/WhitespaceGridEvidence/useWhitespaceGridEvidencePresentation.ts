import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getEvidenceFromFrame } from "../getEvidenceFromFrame";
import type { Input } from "../PdfGridReconstruction.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; frame: number; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  width: number;
  height: number;
  progress: number;
};

/**
 * Returns whitespace grid dimensions, evidence progress, and theme values for
 * `WhitespaceCorridors`, `WhitespaceGridEvidence`.
 */
export function useWhitespaceGridEvidencePresentation({
  input,
  frame,
}: Readonly<Options>): Presentation {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const width = 400 / input.grid.columnLabels.length;
  const height = 80 + input.grid.rows.length * 64;
  const progress = getEvidenceFromFrame({ frame, motion });
  return { input, atomic, tokens, scales, width, height, progress };
}
