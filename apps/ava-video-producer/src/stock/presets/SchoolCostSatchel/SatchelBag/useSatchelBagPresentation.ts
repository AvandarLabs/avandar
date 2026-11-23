import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Values needed to derive this visual's layout and appearance. */
type Options = { opening: number; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  opening: Options["opening"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns bag opening state and theme values for `SatchelFlap`, `SatchelBag`.
 */
export function useSatchelBagPresentation({
  opening,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return { opening, accent, tokens, scales };
}
