import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getAllocationTokensFromInputAndFrame } from "../getAllocationTokensFromInputAndFrame";

/** The type scale step of the request ordinal printed on an earmark tag. */
const REQUEST_ORDINAL_SIZE = "10";
/** Values needed to derive this visual's layout and appearance. */
type Options = {
  token: ReturnType<typeof getAllocationTokensFromInputAndFrame>[number];
  requestOrdinal: number;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  token: Options["token"];
  requestOrdinal: Options["requestOrdinal"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  ordinalSize: number;
  data: ReturnType<
    typeof GraphicThemeHooks.useGraphicTokens
  >["text"]["graphic"]["data"];
};

/**
 * Returns donor identity, request ordinal size, and theme values for
 * `DonorRequestOrdinal`, `DonorToken`, `DonorTokenOutline`.
 */
export function useDonorTokenPresentation({
  token,
  requestOrdinal,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const ordinalSize =
    GraphicThemeHooks.useGraphicFontSize(REQUEST_ORDINAL_SIZE);
  const data = tokens.text.graphic.data;
  return { token, requestOrdinal, accent, tokens, scales, ordinalSize, data };
}
