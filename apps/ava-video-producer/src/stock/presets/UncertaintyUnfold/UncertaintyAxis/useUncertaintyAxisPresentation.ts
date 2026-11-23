import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../UncertaintyUnfold.schema.ts";

/** Authored context and labels for the fixed uncertainty ruler. */
export /** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns uncertainty input and theme values for `UncertaintyContextLabel`,
 * `UncertaintyAxis`, `UncertaintyAxisMaximum`.
 */
export function useUncertaintyAxisPresentation({
  input,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return { input, tokens, scales };
}
