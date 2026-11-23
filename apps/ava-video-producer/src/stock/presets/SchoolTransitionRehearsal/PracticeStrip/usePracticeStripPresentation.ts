import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SchoolTransitionRehearsal.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; learnerX: number; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  learnerX: Options["learnerX"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns rehearsal input, learner position, and theme values for
 * `PracticeStrip`, `PracticeActionLabels`.
 */
export function usePracticeStripPresentation({
  input,
  learnerX,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return { input, learnerX, accent, tokens, scales };
}
